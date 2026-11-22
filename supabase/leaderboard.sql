-- ThockType global leaderboard + anti-cheat. Paste into Supabase → SQL Editor → Run (once). Safe to re-run.
--
-- How it protects the ranking:
-- * The SERVER decides whether a result can be ranked (column `ranked`, set by a trigger on every insert).
--   The app cannot set it, and users can't update results at all (there is no update policy).
-- * A result is rankable only if it is humanly plausible: a 15 s or 60 s test that lasted exactly that long,
--   net speed not above raw speed, speed under a ceiling, decent accuracy and consistency, not dated in the
--   future, and no other test of yours overlapping it in time (you can't finish two 15 s tests 5 s apart).
-- * Anyone can be hidden from every ranking by adding their id to `leaderboard_bans` (only from this dashboard:
--   the table has no policies, so the app can neither read nor write it).
-- Limits: without the server generating the words and checking every keystroke, a careful cheater can still
-- submit a *plausible* fake (say 140 wpm). The ban table is the answer to those.

-- ── Rankable flag ─────────────────────────────────────────────────────────
alter table public.results add column if not exists ranked boolean not null default false;

create or replace function public.result_is_rankable(r public.results) returns boolean
language sql stable set search_path = public as $$
  select r.mode = 'time' and r.value in (15, 60) and r.duration = r.value
    and r.wpm <= r.raw
    and r.wpm <= case r.value when 15 then 300 else 250 end
    and r.acc >= 75 and r.cons >= 40
    and r.date <= now() + interval '5 minutes'
    and not exists (
      select 1 from public.results o
      where o.user_id = r.user_id and o.id is distinct from r.id
        and o.date > r.date - make_interval(secs => r.value - 1)
        and o.date < r.date + make_interval(secs => r.value - 1)
    )
$$;

create or replace function public.results_set_ranked() returns trigger
language plpgsql set search_path = public as $$
begin
  new.ranked := public.result_is_rankable(new);
  return new;
end $$;

drop trigger if exists results_ranked on public.results;
create trigger results_ranked before insert on public.results
  for each row execute function public.results_set_ranked();

-- results uploaded before this existed
update public.results r set ranked = public.result_is_rankable(r);

create index if not exists results_board on public.results (lang, value, wpm desc) where ranked;

-- ── Bans (dashboard only) ─────────────────────────────────────────────────
create table if not exists public.leaderboard_bans (
  user_id uuid primary key references public.profiles on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.leaderboard_bans enable row level security; -- no policies: invisible to the app

-- ── Leaderboard ───────────────────────────────────────────────────────────
-- best ranked result per public profile for one board; returns the top `p_limit` plus your own row
create or replace function public.leaderboard(p_lang text, p_value int, p_pool int, p_since timestamptz default null, p_limit int default 50)
returns table (place bigint, username text, display_name text, avatar_url text, wpm smallint, acc smallint, raw smallint, cons smallint, date timestamptz, is_me boolean)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (r.user_id) r.user_id, r.wpm, r.acc, r.raw, r.cons, r.date
    from results r
    join profiles p on p.id = r.user_id and p.is_public and p.username is not null
    where r.ranked and r.lang = p_lang and r.value = p_value and r.pool is not distinct from p_pool
      and not r.punct and not r.numbers and not r.plain and cardinality(r.rules) = 0
      and (p_since is null or r.date >= p_since)
      and not exists (select 1 from leaderboard_bans b where b.user_id = r.user_id)
    order by r.user_id, r.wpm desc, r.acc desc, r.date asc
  ), placed as (
    select rank() over (order by b.wpm desc, b.acc desc, b.date asc) as place, b.* from best b
  )
  select k.place, p.username, p.display_name, p.avatar_url, k.wpm, k.acc, k.raw, k.cons, k.date, k.user_id = auth.uid()
  from placed k join profiles p on p.id = k.user_id
  where k.place <= least(greatest(p_limit, 1), 100) or k.user_id = auth.uid()
  order by k.place
$$;

-- boards (15/60 s · es/en/code · top 200 words) where this user is in this week's top 10, for the profile badge
create or replace function public.weekly_top(p_username text)
returns table (lang text, value int, place bigint)
language sql stable security definer set search_path = public as $$
  select l.lang, v.value, lb.place
  from (values ('es'), ('en'), ('code')) l(lang)
  cross join (values (15), (60)) v(value)
  cross join lateral public.leaderboard(l.lang, v.value, case when l.lang = 'code' then null else 200 end, now() - interval '7 days', 10) lb
  where lb.username = p_username and lb.place <= 10
$$;

revoke all on function public.leaderboard(text, int, int, timestamptz, int) from public;
revoke all on function public.weekly_top(text) from public;
grant execute on function public.leaderboard(text, int, int, timestamptz, int) to anon, authenticated;
grant execute on function public.weekly_top(text) to anon, authenticated;

-- ── Daily challenge: the result grid must have one square per word ─────────
alter table public.daily drop constraint if exists daily_grid_30;
alter table public.daily add constraint daily_grid_30
  check (char_length(regexp_replace(grid, '[^■□]', '', 'g')) = 30) not valid;

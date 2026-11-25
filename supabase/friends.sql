-- ThockType friends. Paste into Supabase → SQL Editor → Run (after schema.sql). Safe to run again.
-- "Adding a friend" is one-way, like following: no requests to accept. Only you can see your list,
-- and you can only add public profiles that have a @username.

create table if not exists public.friends (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  friend_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friends enable row level security;

drop policy if exists "read own friends" on public.friends;
create policy "read own friends" on public.friends for select using (auth.uid() = user_id);
drop policy if exists "add public friends" on public.friends;
create policy "add public friends" on public.friends for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = friend_id and p.is_public and p.username is not null)
  and (select count(*) from public.friends f where f.user_id = auth.uid()) < 500
);
drop policy if exists "remove own friends" on public.friends;
create policy "remove own friends" on public.friends for delete using (auth.uid() = user_id);

-- your friends with their best time-test wpm, number of tests and last test.
-- security invoker: row level security still applies, so a friend who goes private simply drops out of the list
create or replace function public.my_friends()
returns table (id uuid, username text, display_name text, avatar_url text, best smallint, tests bigint, last_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    (select max(r.wpm) from public.results r where r.user_id = p.id and r.mode = 'time'),
    (select count(*) from public.results r where r.user_id = p.id),
    (select max(r.date) from public.results r where r.user_id = p.id)
  from public.friends f join public.profiles p on p.id = f.friend_id
  where f.user_id = auth.uid()
  order by f.created_at desc
$$;

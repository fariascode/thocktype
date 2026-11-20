-- ThockType database. Paste the whole file into Supabase → SQL Editor → Run (once).
-- Security model: every table has Row Level Security; users write only their own rows,
-- and anyone can read data of public profiles. The publishable key in the app is safe because of this.

-- ── Profiles ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) <= 40),
  bio text check (char_length(bio) <= 160),
  avatar_url text check (char_length(avatar_url) <= 500),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read public or own profile" on public.profiles for select using (is_public or auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- every new account gets a profile row, prefilled from Google when available
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 40), new.raw_user_meta_data ->> 'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Test results ─────────────────────────────────────────────────────────
-- limits reject impossible numbers (basic anti-cheat); unique(user_id, date) makes re-uploads harmless
create table public.results (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  date timestamptz not null,
  wpm smallint not null check (wpm between 0 and 350),
  raw smallint not null check (raw between 0 and 450),
  acc smallint not null check (acc between 0 and 100),
  cons smallint not null check (cons between 0 and 100),
  lang text not null check (lang in ('es', 'en', 'code')),
  mode text not null check (mode in ('time', 'words', 'quote', 'zen', 'custom', 'practice', 'daily')),
  value smallint,
  duration smallint not null check (duration between 1 and 3600),
  punct boolean not null default false,
  numbers boolean not null default false,
  rules text[] not null default '{}',
  unique (user_id, date)
);
create index results_user_date on public.results (user_id, date desc);
alter table public.results enable row level security;
create policy "read results of public profiles or own" on public.results for select using (
  auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = user_id and p.is_public)
);
create policy "insert own results" on public.results for insert with check (auth.uid() = user_id);
create policy "delete own results" on public.results for delete using (auth.uid() = user_id);

-- ── Daily challenge (official attempts, the ranking) ─────────────────────
-- no update policy: the official attempt can never be changed
create table public.daily (
  user_id uuid not null default auth.uid() references public.profiles on delete cascade,
  day date not null,
  lang text not null check (lang in ('es', 'en', 'code')),
  wpm smallint not null check (wpm between 0 and 300),
  acc smallint not null check (acc between 0 and 100),
  grid text not null check (char_length(grid) <= 64),
  created_at timestamptz not null default now(),
  primary key (user_id, day, lang)
);
create index daily_ranking on public.daily (day, lang, wpm desc);
alter table public.daily enable row level security;
create policy "read daily of public profiles or own" on public.daily for select using (
  auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = user_id and p.is_public)
);
-- only today's challenge (±1 day for time zones) can be submitted
create policy "insert own daily for today" on public.daily for insert with check (
  auth.uid() = user_id and day between current_date - 1 and current_date + 1
);

-- ── Lifetime stats for weak keys and the coach ───────────────────────────
create table public.stats (
  user_id uuid primary key default auth.uid() references public.profiles on delete cascade,
  keys jsonb not null default '{}',
  bigrams jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.stats enable row level security;
create policy "read stats of public profiles or own" on public.stats for select using (
  auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = user_id and p.is_public)
);
create policy "insert own stats" on public.stats for insert with check (auth.uid() = user_id);
create policy "update own stats" on public.stats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Avatars (Storage) ────────────────────────────────────────────────────
-- public bucket, each user may only write inside their own folder: avatars/<user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp']);
create policy "avatar upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

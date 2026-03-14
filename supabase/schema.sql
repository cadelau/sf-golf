-- =============================================
-- SF Golf League — Supabase Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Seasons
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  holes int not null default 18,
  par int not null default 72
);

-- Rounds
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons on delete cascade,
  course_id uuid not null references public.courses on delete restrict,
  date date not null,
  max_players int not null default 20,
  tee_start_time time not null,
  tee_interval_minutes int not null default 8,
  notes text,
  is_finalized boolean not null default false,
  created_at timestamptz not null default now()
);

-- Round Players (RSVPs)
create table public.round_players (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds on delete cascade,
  player_id uuid not null references public.profiles on delete cascade,
  status text not null check (status in ('confirmed', 'waitlist', 'declined')),
  tee_time time,
  group_number int,
  rsvp_at timestamptz not null default now(),
  unique (round_id, player_id)
);

-- Scorecards
create table public.scorecards (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds on delete cascade,
  player_id uuid not null references public.profiles on delete cascade,
  total_score int,
  notes text,
  entered_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

-- Hole Scores
create table public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references public.scorecards on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null,
  score int not null,
  unique (scorecard_id, hole_number)
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.courses enable row level security;
alter table public.rounds enable row level security;
alter table public.round_players enable row level security;
alter table public.scorecards enable row level security;
alter table public.hole_scores enable row level security;

-- Profiles: users can read all, update only their own
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles_admin_update" on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Seasons, Courses, Rounds: all authenticated users can read; only admins can write
create policy "seasons_select" on public.seasons for select to authenticated using (true);
create policy "seasons_admin_write" on public.seasons for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "courses_select" on public.courses for select to authenticated using (true);
create policy "courses_admin_write" on public.courses for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "rounds_select" on public.rounds for select to authenticated using (true);
create policy "rounds_admin_write" on public.rounds for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Round Players: all can read; users can RSVP for themselves; admins can manage all
create policy "round_players_select" on public.round_players for select to authenticated using (true);
create policy "round_players_self_insert" on public.round_players for insert to authenticated
  with check (player_id = auth.uid());
create policy "round_players_self_update" on public.round_players for update to authenticated
  using (player_id = auth.uid());
create policy "round_players_admin_all" on public.round_players for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Scorecards + Hole Scores: all can read; only admins can write
create policy "scorecards_select" on public.scorecards for select to authenticated using (true);
create policy "scorecards_admin_write" on public.scorecards for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "hole_scores_select" on public.hole_scores for select to authenticated using (true);
create policy "hole_scores_admin_write" on public.hole_scores for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- =============================================
-- Trigger: auto-create profile on signup
-- =============================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- Seed: initial season
-- =============================================

insert into public.seasons (name, year, is_active) values ('2026 Season', 2026, true);

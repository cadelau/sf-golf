create table if not exists season_payments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  player_id uuid not null references profiles(id) on delete cascade,
  has_paid boolean not null default false,
  unique(season_id, player_id)
);

alter table season_payments enable row level security;

create policy "Admins manage season payments" on season_payments
  for all
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

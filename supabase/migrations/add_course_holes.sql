-- Per-hole par values for each course.
-- These are the canonical pars used across all rounds and players.
create table public.course_holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null default 4 check (par between 3 and 6),
  unique (course_id, hole_number)
);

alter table public.course_holes enable row level security;

create policy "course_holes_select" on public.course_holes for select to authenticated using (true);
create policy "course_holes_admin_write" on public.course_holes for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

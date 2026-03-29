-- Add course_handicap column to scorecards
-- Course handicap is per-round-per-player and used to calculate net score (total_score - course_handicap)
alter table public.scorecards add column if not exists course_handicap int;

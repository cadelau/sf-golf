-- Store course handicap on round_players so it can be set on the tee sheet
-- before scores are entered. Score entry pre-populates from this value.
ALTER TABLE public.round_players
  ADD COLUMN course_handicap int;

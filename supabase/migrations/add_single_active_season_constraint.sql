-- Enforce that at most one season is active at a time.
-- The app always reads "the" active season with .eq("is_active", true).single(),
-- so this guards against ever having two active seasons at once.
create unique index seasons_single_active
  on public.seasons ((is_active))
  where is_active = true;

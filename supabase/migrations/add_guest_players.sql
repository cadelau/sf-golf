-- Allow guest/alternate players to be added to a round without a roster profile
-- Admins can add players by name who are not in the profiles table

-- Make player_id nullable (guests won't have a profile)
ALTER TABLE public.round_players
  ALTER COLUMN player_id DROP NOT NULL;

-- Add a name field for guest players
ALTER TABLE public.round_players
  ADD COLUMN guest_name text;

-- Ensure every row has either a roster player or a guest name
ALTER TABLE public.round_players
  ADD CONSTRAINT round_players_player_or_guest
  CHECK (player_id IS NOT NULL OR guest_name IS NOT NULL);

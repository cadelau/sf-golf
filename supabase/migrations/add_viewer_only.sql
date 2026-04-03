-- Add viewer_only flag to profiles.
-- New signups default to true (read-only) until an admin promotes them.
-- Existing profiles are set to false so current members are unaffected.
ALTER TABLE public.profiles
  ADD COLUMN viewer_only boolean NOT NULL DEFAULT true;

UPDATE public.profiles SET viewer_only = false;

-- Allow admins to update viewer_only on any profile
-- (covered by existing profiles_admin_update policy)

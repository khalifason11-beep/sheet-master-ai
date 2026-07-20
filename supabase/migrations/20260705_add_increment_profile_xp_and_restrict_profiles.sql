-- Migration: add atomic increment_profile_xp RPC (no user_id param) and restrict profile UPDATE privileges

-- 1) Atomic RPC: uses auth.uid() internally so callers cannot increment other users' XP
CREATE OR REPLACE FUNCTION public.increment_profile_xp(_xp int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + _xp,
      updated_at = now()
  WHERE id = _uid;
END;
$$;

-- Grant execute to authenticated (app clients can call the RPC which uses auth.uid())
GRANT EXECUTE ON FUNCTION public.increment_profile_xp(int) TO authenticated, service_role;

-- 2) Replace broad UPDATE privilege with a column-level restriction:
-- revoke general UPDATE from authenticated, then grant UPDATE only on safe columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- Ensure service_role retains full privileges
GRANT ALL ON public.profiles TO service_role;

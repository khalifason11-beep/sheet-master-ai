
-- Achievements: users can only read. Writes go through service_role (server-side grant flow).
DROP POLICY IF EXISTS "Users manage own achievements" ON public.achievements;
REVOKE INSERT, UPDATE, DELETE ON public.achievements FROM authenticated;
CREATE POLICY "Users read own achievements" ON public.achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Profiles: tighten existing policies to authenticated role only.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

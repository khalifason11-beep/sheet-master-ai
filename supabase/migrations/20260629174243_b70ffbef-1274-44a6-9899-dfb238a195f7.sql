DROP POLICY IF EXISTS "Users manage their own progress" ON public.lesson_progress;
CREATE POLICY "Users manage their own progress"
ON public.lesson_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
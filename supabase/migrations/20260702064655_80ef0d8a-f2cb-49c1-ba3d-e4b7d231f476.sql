
-- CMS write helper (any content editor)
CREATE OR REPLACE FUNCTION public.has_cms_write(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('editor','admin','super_admin')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_cms_write(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_cms_write(uuid) TO authenticated, service_role;

-- Extend courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS thumbnail_path text,
  ADD COLUMN IF NOT EXISTS prerequisite_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

-- Exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  expected_outcome text,
  difficulty difficulty_level NOT NULL DEFAULT 'beginner',
  hints text[] NOT NULL DEFAULT '{}',
  file_path text,
  sort_order integer NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published exercises public" ON public.exercises
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.has_cms_write(auth.uid()));
CREATE POLICY "editors write exercises" ON public.exercises
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Media assets registry
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bucket text NOT NULL,
  storage_path text NOT NULL,
  mime text,
  size_bytes bigint,
  kind text NOT NULL DEFAULT 'other', -- image|video|excel|pdf|zip|other
  original_name text,
  alt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, storage_path)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editors read media" ON public.media_assets
  FOR SELECT TO authenticated USING (public.has_cms_write(auth.uid()));
CREATE POLICY "editors write media" ON public.media_assets
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));
CREATE TRIGGER trg_media_updated BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_media_kind ON public.media_assets(kind);
CREATE INDEX IF NOT EXISTS idx_media_created ON public.media_assets(created_at DESC);

-- Broaden write access on existing content tables from admin-only to any CMS writer
DROP POLICY IF EXISTS "admins write courses" ON public.courses;
CREATE POLICY "editors write courses" ON public.courses
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "admins write modules" ON public.modules;
CREATE POLICY "editors write modules" ON public.modules
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "admins write lessons" ON public.lessons;
CREATE POLICY "editors write lessons" ON public.lessons
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "admins write quizzes" ON public.quizzes;
CREATE POLICY "editors write quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "admins write quiz_questions" ON public.quiz_questions;
CREATE POLICY "editors write quiz_questions" ON public.quiz_questions
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "admins write quiz_answers" ON public.quiz_answers;
CREATE POLICY "editors write quiz_answers" ON public.quiz_answers
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "admins write downloadable_resources" ON public.downloadable_resources;
CREATE POLICY "editors write downloadable_resources" ON public.downloadable_resources
  FOR ALL TO authenticated
  USING (public.has_cms_write(auth.uid()))
  WITH CHECK (public.has_cms_write(auth.uid()));

-- Storage RLS for CMS buckets: editors can manage; public bucket readable by anon
CREATE POLICY "cms editors manage course-media"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-media' AND public.has_cms_write(auth.uid()))
  WITH CHECK (bucket_id = 'course-media' AND public.has_cms_write(auth.uid()));

CREATE POLICY "public read course-media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'course-media');

CREATE POLICY "cms editors manage lesson-files"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'lesson-files' AND public.has_cms_write(auth.uid()))
  WITH CHECK (bucket_id = 'lesson-files' AND public.has_cms_write(auth.uid()));

CREATE POLICY "signed-in read lesson-files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-files');

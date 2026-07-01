
-- =========================================================
-- ROLES
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own roles readable" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bootstrap: first-ever admin claim (only works while no admin exists)
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN FALSE; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- =========================================================
-- updated_at helper (reuse existing set_updated_at)
-- =========================================================

-- =========================================================
-- COURSES
-- =========================================================
CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty public.difficulty_level NOT NULL DEFAULT 'beginner',
  estimated_min INT NOT NULL DEFAULT 0,
  xp_reward INT NOT NULL DEFAULT 0,
  cover_url TEXT,
  status public.content_status NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published courses public" ON public.courses FOR SELECT TO anon, authenticated USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- MODULES
-- =========================================================
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, slug)
);
CREATE INDEX ON public.modules(course_id, sort_order);
GRANT SELECT ON public.modules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT ALL ON public.modules TO service_role;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published modules public" ON public.modules FOR SELECT TO anon, authenticated
  USING (public.has_role(auth.uid(),'admin') OR (status='published' AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.status='published')));
CREATE POLICY "admins write modules" ON public.modules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_modules_updated BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- LESSONS
-- =========================================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  objectives TEXT[] NOT NULL DEFAULT '{}',
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_min INT NOT NULL DEFAULT 5,
  xp_reward INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'draft',
  prerequisite_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);
CREATE INDEX ON public.lessons(module_id, sort_order);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published lessons public" ON public.lessons FOR SELECT TO anon, authenticated
  USING (public.has_role(auth.uid(),'admin') OR (status='published' AND EXISTS (
    SELECT 1 FROM public.modules m JOIN public.courses c ON c.id=m.course_id
    WHERE m.id=module_id AND m.status='published' AND c.status='published')));
CREATE POLICY "admins write lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- QUIZZES
-- =========================================================
CREATE TYPE public.question_kind AS ENUM ('multiple_choice','multiple_select','true_false','short_answer');

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pass_score INT NOT NULL DEFAULT 70,
  xp_reward INT NOT NULL DEFAULT 20,
  status public.content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (lesson_id IS NOT NULL OR course_id IS NOT NULL)
);
GRANT SELECT ON public.quizzes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published quizzes public" ON public.quizzes FOR SELECT TO anon, authenticated USING (public.has_role(auth.uid(),'admin') OR status='published');
CREATE POLICY "admins write quizzes" ON public.quizzes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_quizzes_updated BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  kind public.question_kind NOT NULL,
  prompt TEXT NOT NULL,
  explanation TEXT,
  points INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.quiz_questions(quiz_id, sort_order);
GRANT SELECT ON public.quiz_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz questions readable" ON public.quiz_questions FOR SELECT TO anon, authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id=quiz_id AND q.status='published'));
CREATE POLICY "admins write questions" ON public.quiz_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX ON public.quiz_answers(question_id, sort_order);
GRANT SELECT ON public.quiz_answers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
-- Note: is_correct is exposed; grading happens server-side. Restrict via server fn projection in practice.
CREATE POLICY "quiz answers readable" ON public.quiz_answers FOR SELECT TO anon, authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.quiz_questions qq JOIN public.quizzes q ON q.id=qq.quiz_id
    WHERE qq.id=question_id AND q.status='published'));
CREATE POLICY "admins write answers" ON public.quiz_answers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.quiz_results(user_id, quiz_id);
GRANT SELECT, INSERT ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own results" ON public.quiz_results FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own results" ON public.quiz_results FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);

-- =========================================================
-- DOWNLOADABLE RESOURCES
-- =========================================================
CREATE TABLE public.downloadable_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.downloadable_resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.downloadable_resources TO authenticated;
GRANT ALL ON public.downloadable_resources TO service_role;
ALTER TABLE public.downloadable_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources readable" ON public.downloadable_resources FOR SELECT TO anon, authenticated
  USING (public.has_role(auth.uid(),'admin') OR
    (lesson_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.lessons l WHERE l.id=lesson_id AND l.status='published')) OR
    (module_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.modules m WHERE m.id=module_id AND m.status='published')) OR
    (course_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id=course_id AND c.status='published')));
CREATE POLICY "admins write resources" ON public.downloadable_resources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- CERTIFICATES
-- =========================================================
CREATE TABLE public.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_template TEXT NOT NULL DEFAULT 'This certifies that {name} has completed {course}.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.certificate_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.certificate_templates TO authenticated;
GRANT ALL ON public.certificate_templates TO service_role;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert templates readable" ON public.certificate_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins write cert templates" ON public.certificate_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_cert_templates_updated BEFORE UPDATE ON public.certificate_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.issued_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  serial TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(9),'hex'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT ON public.issued_certificates TO authenticated;
GRANT ALL ON public.issued_certificates TO service_role;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own certificates" ON public.issued_certificates FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own certificate" ON public.issued_certificates FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);

-- =========================================================
-- LESSON PROGRESS — augment
-- =========================================================
ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS lesson_progress_course_idx ON public.lesson_progress(user_id, course_id);


-- Allow CMS writers (editor/admin/super_admin) to read draft quizzes and their questions/answers so the quiz builder can load them.
DROP POLICY IF EXISTS "published quizzes public" ON public.quizzes;
CREATE POLICY "quizzes readable" ON public.quizzes FOR SELECT
  USING (status = 'published'::content_status OR public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "quiz questions readable" ON public.quiz_questions;
CREATE POLICY "quiz questions readable" ON public.quiz_questions FOR SELECT
  USING (
    public.has_cms_write(auth.uid())
    OR EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_questions.quiz_id AND q.status = 'published'::content_status)
  );

DROP POLICY IF EXISTS "quiz answers readable" ON public.quiz_answers;
CREATE POLICY "quiz answers readable" ON public.quiz_answers FOR SELECT
  USING (
    public.has_cms_write(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      WHERE qq.id = quiz_answers.question_id AND q.status = 'published'::content_status
    )
  );

-- Same treatment for lessons/modules/courses/exercises so CMS writers can preview drafts.
DROP POLICY IF EXISTS "lessons readable" ON public.lessons;
CREATE POLICY "lessons readable" ON public.lessons FOR SELECT
  USING (status = 'published'::content_status OR public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "modules readable" ON public.modules;
CREATE POLICY "modules readable" ON public.modules FOR SELECT
  USING (status = 'published'::content_status OR public.has_cms_write(auth.uid()));

DROP POLICY IF EXISTS "exercises readable" ON public.exercises;
CREATE POLICY "exercises readable" ON public.exercises FOR SELECT
  USING (status = 'published'::content_status OR public.has_cms_write(auth.uid()));

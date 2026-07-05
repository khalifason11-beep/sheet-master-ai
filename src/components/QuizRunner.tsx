import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLessonQuiz, submitQuiz } from "@/lib/learn.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, HelpCircle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type SubmittedAnswer = { question_id: string; answer_ids?: string[]; text?: string };

export function QuizRunner({ lessonId }: { lessonId: string }) {
  const fetchQuiz = useServerFn(getLessonQuiz);
  const submit = useServerFn(submitQuiz);
  const { data, isLoading } = useQuery({
    queryKey: ["quiz", lessonId],
    queryFn: () => fetchQuiz({ data: { lessonId } }),
  });

  const [answers, setAnswers] = useState<Record<string, SubmittedAnswer>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof submit>> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading || !data) return null;
  const { quiz, questions, answers: options } = data;

  const setPick = (qid: string, patch: Partial<SubmittedAnswer>) =>
    setAnswers((s) => ({ ...s, [qid]: { ...s[qid], ...patch, question_id: qid } }));

  const handleSubmit = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in to take quizzes"); return; }
    setSubmitting(true);
    try {
      const payload = questions.map((q: { id: string }) => answers[q.id] ?? { question_id: q.id });
      const r = await submit({ data: { quiz_id: quiz.id, answers: payload } });
      setResult(r);
      if (r.passed) toast.success(`Passed — ${r.percent}%`);
      else toast.error(`Score ${r.percent}%. Try again.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-10 rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">{quiz.title || "Knowledge check"}</h2>
      </div>
      {quiz.description && <p className="mt-1 text-sm text-muted-foreground">{quiz.description}</p>}
      <div className="mt-1 text-xs text-muted-foreground">
        Passing score: {quiz.pass_score ?? 70}% · {quiz.xp_reward ?? 0} XP
      </div>

      <div className="mt-5 space-y-5">
        {questions.map((q: any, idx: number) => {
          const opts = options.filter((o: any) => o.question_id === q.id);
          const sub = answers[q.id];
          const feedback = result?.breakdown.find((b) => b.question_id === q.id);
          return (
            <Card key={q.id} className={feedback ? (feedback.correct ? "border-green-500/60" : "border-destructive/60") : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-sm font-semibold text-muted-foreground">{idx + 1}.</span>
                  <div className="flex-1">
                    <div className="font-medium">{q.prompt}</div>
                    <div className="mt-3 space-y-2">
                      {(q.kind === "multiple_choice" || q.kind === "true_false") && opts.map((o: any) => (
                        <label key={o.id} className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent/40 cursor-pointer">
                          <input
                            type="radio"
                            name={q.id}
                            disabled={!!result}
                            checked={sub?.answer_ids?.[0] === o.id}
                            onChange={() => setPick(q.id, { answer_ids: [o.id] })}
                          />
                          <span className="text-sm">{o.text}</span>
                        </label>
                      ))}
                      {q.kind === "multiple_select" && opts.map((o: any) => {
                        const checked = sub?.answer_ids?.includes(o.id) ?? false;
                        return (
                          <label key={o.id} className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent/40 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!!result}
                              checked={checked}
                              onChange={(e) => {
                                const cur = new Set(sub?.answer_ids ?? []);
                                if (e.target.checked) cur.add(o.id); else cur.delete(o.id);
                                setPick(q.id, { answer_ids: [...cur] });
                              }}
                            />
                            <span className="text-sm">{o.text}</span>
                          </label>
                        );
                      })}
                      {q.kind === "short_answer" && (
                        <input
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          disabled={!!result}
                          value={sub?.text ?? ""}
                          onChange={(e) => setPick(q.id, { text: e.target.value })}
                          placeholder="Your answer"
                        />
                      )}
                    </div>
                    {feedback && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        {feedback.correct ? (
                          <><CheckCircle2 className="h-4 w-4 text-green-600" /> Correct</>
                        ) : (
                          <><XCircle className="h-4 w-4 text-destructive" /> Not quite</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {result ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-primary" />
              Score: <b>{result.score}/{result.max}</b> ({result.percent}%) — {result.passed ? "Passed" : "Try again"}
            </div>
            <Button variant="outline" onClick={() => { setResult(null); setAnswers({}); }}>Retake</Button>
          </>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Grading…" : "Submit answers"}</Button>
        )}
      </div>
    </div>
  );
}

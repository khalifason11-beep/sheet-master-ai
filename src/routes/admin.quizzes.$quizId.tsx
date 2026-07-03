import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Check, X } from "lucide-react";
import { adminGetQuiz, upsertQuiz, deleteQuiz, saveQuestion, deleteQuestion } from "@/lib/cms-admin.functions";

export const Route = createFileRoute("/admin/quizzes/$quizId")({
  head: () => ({ meta: [{ title: "Quiz builder — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: QuizBuilder,
});

type QuestionKind = "multiple_choice" | "multiple_select" | "true_false" | "short_answer";
type Quiz = { id: string; lesson_id: string | null; title: string; description: string | null; pass_score: number; xp_reward: number; status: "draft" | "published" | "archived" };
type Question = { id: string; quiz_id: string; kind: QuestionKind; prompt: string; explanation: string | null; points: number; sort_order: number };
type Answer = { id: string; question_id: string; text: string; is_correct: boolean; sort_order: number };

function QuizBuilder() {
  const { quizId } = Route.useParams();
  const qc = useQueryClient();
  const getQuiz = useServerFn(adminGetQuiz);
  const upQuiz = useServerFn(upsertQuiz);
  const delQuiz = useServerFn(deleteQuiz);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "quiz", quizId],
    queryFn: () => getQuiz({ data: { id: quizId } }),
  });

  const [meta, setMeta] = useState({ title: "", description: "", pass_score: 70, xp_reward: 30, status: "draft" as "draft" | "published" | "archived" });
  useEffect(() => {
    if (!data) return;
    const { quiz } = data as { quiz: Quiz };
    setMeta({ title: quiz.title, description: quiz.description ?? "", pass_score: quiz.pass_score, xp_reward: quiz.xp_reward, status: quiz.status });
  }, [data]);

  if (isLoading) return <PageLoader label="Loading quiz" />;
  if (!data) return <><AdminPageHeader title="Quiz not found" /><Link to="/admin" className="text-primary underline">← Admin</Link></>;

  const { quiz, questions, answers } = data as { quiz: Quiz; questions: Question[]; answers: Answer[] };

  async function saveMeta() {
    await upQuiz({ data: { id: quizId, title: meta.title, description: meta.description || null, pass_score: Number(meta.pass_score), xp_reward: Number(meta.xp_reward), status: meta.status, lesson_id: quiz.lesson_id } });
    toast.success("Quiz saved");
    qc.invalidateQueries({ queryKey: ["admin", "quiz", quizId] });
  }

  return (
    <>
      <AdminPageHeader
        title={meta.title || "Untitled quiz"}
        description={quiz.lesson_id ? "Attached to a lesson. Learners take it after completing lesson content." : "Standalone quiz."}
        actions={
          <>
            <Badge variant={quiz.status === "published" ? "default" : "secondary"}>{quiz.status}</Badge>
            {quiz.lesson_id && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/lessons/$lessonId" params={{ lessonId: quiz.lesson_id }}>← Back to lesson</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside>
          <Card>
            <CardContent className="space-y-3 p-4">
              <h3 className="text-sm font-semibold">Quiz settings</h3>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Pass score %</Label>
                  <Input type="number" value={meta.pass_score} onChange={(e) => setMeta({ ...meta, pass_score: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">XP reward</Label>
                  <Input type="number" value={meta.xp_reward} onChange={(e) => setMeta({ ...meta, xp_reward: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value as "draft" | "published" | "archived" })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={saveMeta}>Save</Button>
                <Button variant="ghost" size="icon" onClick={async () => {
                  if (!confirm("Delete this quiz?")) return;
                  await delQuiz({ data: { id: quizId } });
                  window.location.href = quiz.lesson_id ? `/admin/lessons/${quiz.lesson_id}` : "/admin";
                }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div>
          <QuestionsList
            quizId={quizId}
            questions={questions}
            answers={answers}
          />
        </div>
      </div>
    </>
  );
}

function QuestionsList({ quizId, questions, answers }: { quizId: string; questions: Question[]; answers: Answer[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveQuestion);
  const del = useServerFn(deleteQuestion);

  async function addQuestion(kind: QuestionKind) {
    const defaults: { text: string; is_correct: boolean }[] =
      kind === "true_false"
        ? [{ text: "True", is_correct: true }, { text: "False", is_correct: false }]
        : kind === "short_answer"
          ? [{ text: "", is_correct: true }]
          : [{ text: "Option 1", is_correct: true }, { text: "Option 2", is_correct: false }];
    await save({ data: {
      quiz_id: quizId, kind, prompt: "New question", points: 1,
      sort_order: questions.length, answers: defaults,
    } });
    qc.invalidateQueries({ queryKey: ["admin", "quiz", quizId] });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2">
        <span className="text-xs font-medium text-muted-foreground">Add question:</span>
        <Button size="sm" variant="outline" onClick={() => addQuestion("multiple_choice")}><Plus className="mr-1 h-3 w-3" />Multiple choice</Button>
        <Button size="sm" variant="outline" onClick={() => addQuestion("multiple_select")}><Plus className="mr-1 h-3 w-3" />Multi-select</Button>
        <Button size="sm" variant="outline" onClick={() => addQuestion("true_false")}><Plus className="mr-1 h-3 w-3" />True / False</Button>
        <Button size="sm" variant="outline" onClick={() => addQuestion("short_answer")}><Plus className="mr-1 h-3 w-3" />Short answer</Button>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No questions yet. Add one above.
        </div>
      ) : questions.map((q, i) => (
        <QuestionCard
          key={q.id}
          index={i}
          question={q}
          answers={answers.filter((a) => a.question_id === q.id).sort((a, b) => a.sort_order - b.sort_order)}
          onSave={async (updated) => {
            await save({ data: updated });
            qc.invalidateQueries({ queryKey: ["admin", "quiz", quizId] });
          }}
          onDelete={async () => {
            if (!confirm("Delete this question?")) return;
            await del({ data: { id: q.id } });
            qc.invalidateQueries({ queryKey: ["admin", "quiz", quizId] });
          }}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  index, question, answers, onSave, onDelete,
}: {
  index: number;
  question: Question;
  answers: Answer[];
  onSave: (payload: {
    id: string; quiz_id: string; kind: QuestionKind; prompt: string;
    explanation: string | null; points: number; sort_order: number;
    answers: { text: string; is_correct: boolean; sort_order: number }[];
  }) => Promise<void>;
  onDelete: () => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [explanation, setExplanation] = useState(question.explanation ?? "");
  const [points, setPoints] = useState(question.points);
  const [items, setItems] = useState(answers.map((a) => ({ text: a.text, is_correct: a.is_correct })));
  const isSingleCorrect = question.kind === "multiple_choice" || question.kind === "true_false";

  useEffect(() => {
    setPrompt(question.prompt);
    setExplanation(question.explanation ?? "");
    setPoints(question.points);
    setItems(answers.map((a) => ({ text: a.text, is_correct: a.is_correct })));
  }, [question.id, question.prompt, question.explanation, question.points, answers]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted-foreground">Question {index + 1} · {question.kind.replace("_", " ")}</div>
            <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Question prompt" />
          </div>
          <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>

        {question.kind === "short_answer" ? (
          <div className="space-y-1">
            <Label className="text-xs">Accepted answer</Label>
            <Input
              value={items[0]?.text ?? ""}
              onChange={(e) => setItems([{ text: e.target.value, is_correct: true }])}
              placeholder="Exact text learner must type"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border p-2">
                <Checkbox
                  checked={a.is_correct}
                  onCheckedChange={(v) => {
                    if (isSingleCorrect) {
                      setItems(items.map((it, j) => ({ ...it, is_correct: j === i && Boolean(v) })));
                    } else {
                      setItems(items.map((it, j) => (j === i ? { ...it, is_correct: Boolean(v) } : it)));
                    }
                  }}
                />
                <Input
                  value={a.text}
                  onChange={(e) => setItems(items.map((it, j) => (j === i ? { ...it, text: e.target.value } : it)))}
                  className="flex-1"
                  placeholder={`Option ${i + 1}`}
                  disabled={question.kind === "true_false"}
                />
                {question.kind !== "true_false" && (
                  <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                {a.is_correct ? <Check className="h-4 w-4 text-primary" /> : null}
              </div>
            ))}
            {question.kind !== "true_false" && (
              <Button size="sm" variant="outline"
                onClick={() => setItems([...items, { text: `Option ${items.length + 1}`, is_correct: false }])}
              ><Plus className="mr-1 h-3 w-3" /> Add option</Button>
            )}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_100px]">
          <div className="space-y-1">
            <Label className="text-xs">Explanation (shown after answering)</Label>
            <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Points</Label>
            <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm"
            onClick={async () => {
              if (!prompt.trim()) return toast.error("Prompt required");
              if (question.kind !== "short_answer" && !items.some((a) => a.is_correct)) return toast.error("Mark at least one correct answer");
              await onSave({
                id: question.id, quiz_id: question.quiz_id, kind: question.kind,
                prompt, explanation: explanation || null, points, sort_order: question.sort_order,
                answers: items.map((a, i) => ({ text: a.text, is_correct: a.is_correct, sort_order: i })),
              });
              toast.success("Saved");
            }}
          >Save question</Button>
        </div>
      </CardContent>
    </Card>
  );
}

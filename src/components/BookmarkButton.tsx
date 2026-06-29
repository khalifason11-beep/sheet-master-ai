import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export function BookmarkButton({ lessonId }: { lessonId: string }) {
  const [authed, setAuthed] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAuthed(true);
      const { data } = await supabase.from("bookmarks").select("id").eq("lesson_id", lessonId).maybeSingle();
      if (data) setId(data.id);
    })();
  }, [lessonId]);

  const toggle = async () => {
    if (!authed) return toast.error("Sign in to bookmark lessons");
    setBusy(true);
    if (id) {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (!error) { setId(null); track("bookmark_removed", { lesson_id: lessonId }); }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setBusy(false); return; }
      const { data, error } = await supabase.from("bookmarks").insert({ user_id: user.id, lesson_id: lessonId }).select("id").maybeSingle();
      if (!error && data) { setId(data.id); track("bookmark_added", { lesson_id: lessonId }); toast.success("Bookmarked"); }
    }
    setBusy(false);
  };

  return (
    <Button size="sm" variant={id ? "default" : "outline"} onClick={toggle} disabled={busy} className={id ? "bg-primary text-primary-foreground" : ""}>
      <Bookmark className={`mr-1.5 h-4 w-4 ${id ? "fill-current" : ""}`} />
      {id ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}

import { useEffect, useState } from "react";
import { Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export function SaveFormulaButton({ name, formula, description }: { name: string; formula: string; description?: string }) {
  const [authed, setAuthed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAuthed(true);
      const { data } = await supabase.from("saved_formulas").select("id").eq("name", name).maybeSingle();
      if (data) setSaved(true);
    })();
  }, [name]);

  const save = async () => {
    if (!authed) return toast.error("Sign in to save formulas");
    if (saved) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const { error } = await supabase.from("saved_formulas").insert({
      user_id: user.id,
      name: name.slice(0, 80),
      formula: formula.slice(0, 500),
      description: (description ?? "").slice(0, 280) || null,
    });
    setBusy(false);
    if (error) return toast.error("Couldn't save formula");
    setSaved(true);
    track("formula_saved", { name });
    toast.success("Saved to your library");
  };

  return (
    <Button size="sm" variant={saved ? "default" : "outline"} onClick={save} disabled={busy || saved} className={saved ? "bg-primary text-primary-foreground" : ""}>
      {saved ? <Check className="mr-1.5 h-4 w-4" /> : <Save className="mr-1.5 h-4 w-4" />}
      {saved ? "Saved" : "Save formula"}
    </Button>
  );
}

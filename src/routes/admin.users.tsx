import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageHeader } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import { adminListUsers, adminSetUserRole, adminDeleteUser } from "@/lib/cms-super.functions";
import { useIsAdmin } from "@/hooks/use-is-admin";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Cellow admin" }, { name: "robots", content: "noindex" }] }),
  component: UsersPage,
});

const ROLES = ["editor", "admin", "super_admin"] as const;
type Role = (typeof ROLES)[number];

function UsersPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetUserRole);
  const del = useServerFn(adminDeleteUser);
  const { userId: me } = useIsAdmin();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () => list({ data: { page, perPage: 50, search: search || undefined } }),
  });

  async function toggleRole(userId: string, role: Role, has: boolean) {
    try {
      await setRole({ data: { userId, role, grant: !has } });
      toast.success(has ? `Revoked ${role}` : `Granted ${role}`);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
  }

  async function removeUser(userId: string, email: string | null) {
    if (!confirm(`Permanently delete user ${email ?? userId}? This cannot be undone.`)) return;
    try {
      await del({ data: { userId } });
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (e) { toast.error((e as Error).message ?? "Failed"); }
  }

  return (
    <>
      <AdminPageHeader
        title="Users & roles"
        description="Grant editor, admin, or super_admin roles. Server re-verifies every mutation."
      />
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>
      {isLoading ? <PageLoader label="Loading users" /> : (
        <div className="space-y-2">
          {(data?.users ?? []).map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback>{(u.full_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{u.full_name ?? "Unnamed"}</div>
                    {u.plan && u.plan !== "free" && <Badge variant="secondary">{u.plan}</Badge>}
                    {u.id === me && <Badge>you</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{u.email ?? u.id}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {ROLES.map((r) => {
                    const has = u.roles.includes(r);
                    return (
                      <Button
                        key={r}
                        size="sm"
                        variant={has ? "default" : "outline"}
                        onClick={() => toggleRole(u.id, r, has)}
                      >
                        {has ? <ShieldCheck className="mr-1 h-3.5 w-3.5" /> : <ShieldOff className="mr-1 h-3.5 w-3.5" />}
                        {r}
                      </Button>
                    );
                  })}
                  <Button size="sm" variant="ghost" onClick={() => removeUser(u.id, u.email)} disabled={u.id === me}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(data?.users ?? []).length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <div className="text-xs text-muted-foreground self-center">Page {page}</div>
            <Button variant="outline" size="sm" disabled={(data?.users.length ?? 0) < 50} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </>
  );
}

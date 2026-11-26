import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { utilityService } from "@/api/services/utility.service";
import { formatDate } from "@/lib/dateFormat";
import { guardedLogout, onLogoutBlocked, type LogoutBlocked } from "@/lib/logoutGuard";

/**
 * Shown when a staff member presses Logout while tasks assigned to them are
 * due today or overdue and not Complete (see lib/logoutGuard.ts). They can
 * mark each one Complete here; when none are left, "Log out now" works.
 * Mounted once, inside the router (App.tsx).
 */
export function PendingTasksLogoutDialog() {
  const [state, setState] = useState<LogoutBlocked | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => onLogoutBlocked((d) => setState(d)), []);

  if (!state) return null;
  const pending = state.pending;
  const base = location.pathname.startsWith("/staff") ? "/staff" : "/admin";

  const complete = async (id: string) => {
    setBusy(id);
    try {
      await utilityService.completeMyTask(id);
      setState((s) => (s ? { ...s, pending: s.pending.filter((t) => t._id !== id) } : s));
      toast.success("Task marked Complete");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Could not complete the task");
    } finally {
      setBusy(null);
    }
  };

  const logoutNow = async () => {
    const proceed = state.proceed;
    setLeaving(true);
    setState(null);
    // Checked again: a task may have become due meanwhile.
    await guardedLogout(proceed);
    setLeaving(false);
  };

  const open = (id: string) => {
    setState(null);
    navigate(`${base}/tasks?taskId=${id}`);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && setState(null)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${pending.length ? "text-amber-700" : "text-emerald-700"}`}>
            {pending.length ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {pending.length ? "Finish today's tasks before logging out" : "All done"}
          </DialogTitle>
          <DialogDescription>
            {pending.length
              ? `You have ${pending.length} task${pending.length > 1 ? "s" : ""} due today or overdue that ${pending.length > 1 ? "are" : "is"} not complete. Mark ${pending.length > 1 ? "them" : "it"} Complete to log out. Your admin has been told.`
              : "Every task due today is complete. You can log out now."}
          </DialogDescription>
        </DialogHeader>

        {pending.length > 0 && (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border divide-y">
            {pending.map((t) => (
              <div key={t._id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.project ? `${t.project} · ` : ""}Due {formatDate(t.duedate)} · {t.statusLabel}
                  </p>
                </div>
                {t.overdue && <Badge variant="outline" className="text-[10px] rounded-full bg-red-50 text-red-700 border-red-200 shrink-0">Overdue</Badge>}
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Open task" onClick={() => open(t._id)}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button size="sm" className="h-8 text-xs shrink-0" disabled={busy !== null} onClick={() => complete(t._id)}>
                  {busy === t._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark Complete"}
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setState(null)}>Stay logged in</Button>
          <Button onClick={logoutNow} disabled={pending.length > 0 || leaving} className="gap-2">
            <LogOut className="h-4 w-4" />Log out now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

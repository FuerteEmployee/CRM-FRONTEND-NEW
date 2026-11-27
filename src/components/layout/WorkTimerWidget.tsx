// Top-bar work timer: "Start Work" button, then a running clock (green while
// working, amber on a break). Clicking it opens today's details with Pause /
// Resume / Stop Work and the running task timer. Also: the "Start your work
// day?" prompt after login and the "Stop Work & Log out" popup at logout.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Coffee, ExternalLink, LogOut, Pause, Play, Square, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clock, useTick, useWorkTimer } from "@/context/WorkTimerContext";
import { usePermissions } from "@/hooks/usePermissions";
import { reportAllowed } from "@/lib/reportAccess";
import { onLogoutWorkRunning, type LogoutWorkRunning } from "@/lib/logoutGuard";

const timeOf = (v?: string | null) => (v ? new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-");
const useBase = () => (useLocation().pathname.startsWith("/staff") ? "/staff" : "/admin");
const errText = (e: any) => e?.response?.data?.message || e?.message || "Something went wrong";

export function WorkTimerWidget({ compact = false }: { compact?: boolean }) {
  const w = useWorkTimer();
  const base = useBase();
  const { canView } = usePermissions();
  const [open, setOpen] = useState(false);
  const session = w.status?.session || null;
  const task = w.status?.taskTimer || null;
  useTick(!!session || open);
  if (!w.enabled || !w.status) return null;

  const run = (fn: () => Promise<any>, ok?: string) => fn().then(() => ok && toast.success(ok)).catch((e) => toast.error(errText(e)));
  const worked = w.workedToday();
  const onBreak = session?.status === "paused";
  const breakNow = onBreak && session?.breakStart ? (w.now() - new Date(session.breakStart).getTime()) / 1000 : 0;
  const taskElapsed = task ? (w.now() - new Date(task.start).getTime()) / 1000 : 0;
  const today = w.status.today;

  if (!session) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={w.busy}
        onClick={() => run(w.start, "Work started")}
        className="h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        title={today.workedSeconds ? `Worked today: ${clock(today.workedSeconds)}` : "Start your work day"}
      >
        <Play className="h-3.5 w-3.5" />
        <span>{compact ? "Start" : "Start Work"}</span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={onBreak ? "Work timer — on a break" : "Work timer — working"}
          className={`h-8 inline-flex items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold tabular-nums transition-colors ${
            onBreak ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${onBreak ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`} />
          {onBreak ? <Coffee className="h-3.5 w-3.5" /> : <Timer className="h-3.5 w-3.5" />}
          <span>{clock(worked)}</span>
          {task && !compact && <span className="hidden xl:inline max-w-[140px] truncate font-medium opacity-80">· {task.taskName}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Work today</p>
          <p className={`text-3xl font-black tabular-nums ${onBreak ? "text-amber-600" : "text-emerald-600"}`}>{clock(worked)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {onBreak ? <>On a break for <b>{clock(breakNow)}</b></> : <>Working since <b>{timeOf(session.start)}</b></>}
            {today.breakSeconds > 0 && <> · breaks {clock(today.breakSeconds + (onBreak ? breakNow - 0 : 0)).slice(0, -3)}</>}
          </p>
        </div>

        {task && (
          <div className="p-4 border-b space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Task timer</p>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{task.taskName}</p>
                {task.project && <p className="text-xs text-muted-foreground truncate">{task.project}</p>}
              </div>
              <span className="text-sm font-bold tabular-nums">{clock(taskElapsed)}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5" disabled={w.busy} onClick={() => run(w.stopTask, "Task time saved")}>
                <Square className="h-3.5 w-3.5" />Stop task
              </Button>
              <Button size="sm" variant="ghost" asChild className="gap-1.5">
                <Link to={`${base}/tasks?taskId=${task.taskId}`} onClick={() => setOpen(false)}><ExternalLink className="h-3.5 w-3.5" />Open</Link>
              </Button>
            </div>
          </div>
        )}

        {today.sessions.length > 0 && (
          <div className="px-4 py-3 border-b max-h-40 overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Today</p>
            {today.sessions.map((s) => (
              <div key={s._id} className="flex justify-between text-xs py-0.5">
                <span>{timeOf(s.start)} – {s.end ? timeOf(s.end) : "now"}</span>
                <span className="text-muted-foreground">
                  {s.breaks.length ? `${s.breaks.length} break${s.breaks.length > 1 ? "s" : ""}` : ""}
                  {s.endedBy === "auto" ? " · auto-stopped" : s.endedBy === "logout" ? " · logout" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 flex gap-2">
          {onBreak ? (
            <Button size="sm" className="flex-1 gap-1.5" disabled={w.busy} onClick={() => run(w.resume, "Back to work")}><Play className="h-3.5 w-3.5" />Resume</Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" disabled={w.busy} onClick={() => run(w.pause, "Break started")}><Pause className="h-3.5 w-3.5" />Pause (break)</Button>
          )}
          <Button size="sm" variant="destructive" className="flex-1 gap-1.5" disabled={w.busy} onClick={() => run(w.stop, "Work stopped").then(() => setOpen(false))}>
            <Square className="h-3.5 w-3.5" />Stop Work
          </Button>
        </div>
        {reportAllowed("staff-work", canView) && (
          <div className="px-3 pb-3">
            <Button size="sm" variant="ghost" asChild className="w-full text-xs">
              <Link to={`${base}/reports/staff-work?date=${today.date}`} onClick={() => setOpen(false)}>My work report</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** After login: "Start your work day?" — once per login, only when no work day is open. */
export function WorkStartPrompt() {
  const w = useWorkTimer();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!w.enabled || !w.status || w.status.session) return;
    let key = "";
    try { key = "crm_work_prompt:" + (localStorage.getItem("crm_token") || "").slice(-24); } catch { return; }
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* storage blocked: ask anyway */ }
    setShow(true);
  }, [w.enabled, w.status]);
  if (!show) return null;
  const worked = w.status?.today.workedSeconds || 0;
  return (
    <Dialog open onOpenChange={(o) => !o && setShow(false)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-emerald-600" />Start your work day?</DialogTitle>
          <DialogDescription>
            The timer runs in the top bar while you work. Use Pause for breaks and Stop Work when you leave.
            {worked > 0 && <> You have already worked <b>{clock(worked)}</b> today.</>}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setShow(false)}>Later</Button>
          <Button className="gap-1.5" disabled={w.busy} onClick={() => w.start().then(() => { setShow(false); toast.success("Work started"); }).catch((e) => toast.error(errText(e)))}>
            <Play className="h-4 w-4" />Start Work
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** At logout with the work timer running: "Stop Work & Log out". */
export function WorkLogoutDialog() {
  const w = useWorkTimer();
  const [state, setState] = useState<LogoutWorkRunning | null>(null);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => onLogoutWorkRunning((d) => setState(d)), []);
  useTick(!!state);
  if (!state) return null;
  const stopAndLeave = async () => {
    setLeaving(true);
    try {
      await w.stop("logout");
    } catch { /* the server closes it at the last heartbeat anyway */ }
    const proceed = state.proceed;
    setState(null);
    setLeaving(false);
    await proceed();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && setState(null)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-emerald-600" />Stop your work timer?</DialogTitle>
          <DialogDescription>
            You worked <b>{clock(w.workedToday())}</b> today{w.status?.taskTimer ? <> — the timer on “{w.status.taskTimer.taskName}” is saved too</> : null}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setState(null)}>Cancel</Button>
          <Button variant="destructive" className="gap-1.5" disabled={leaving} onClick={stopAndLeave}>
            <LogOut className="h-4 w-4" />Stop Work & Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

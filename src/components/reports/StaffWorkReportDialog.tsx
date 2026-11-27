// Reports > Work Overview > click a staff member: their own report — every task
// assigned to them grouped project-wise (then customer / lead / other / no
// project), with the task description, status, priority, dates, checklist and
// the hours they logged in the selected period. Data: GET /reports/staff-report/:id.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle, Building2, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, CircleDot, Clock,
  FolderKanban, ListChecks, Mail, MessageSquare, Phone, Search, Target, UserRound,
} from "lucide-react";
import { utilityService } from "@/api/services/utility.service";
import type { ExportKind } from "@/lib/reportExport";
import { ExportMenu, runExport, LoadError, Loading, useCompanyName, fmtDate, periodLabel, needsDate, hm, clockTime } from "@/pages/ReportPages";

type Show = "all" | "pending" | "overdue" | "done";

const TASK_TONE: Record<number, string> = {
  1: "bg-slate-100 text-slate-700 border-slate-200",
  2: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-purple-50 text-purple-700 border-purple-200",
  4: "bg-amber-50 text-amber-700 border-amber-200",
  5: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const PRIORITY_TONE: Record<number, string> = {
  1: "bg-green-50 text-green-700 border-green-200",
  2: "bg-yellow-50 text-yellow-700 border-yellow-200",
  3: "bg-orange-50 text-orange-700 border-orange-200",
  4: "bg-red-50 text-red-700 border-red-200",
};
const PROJECT_TONE: Record<number, string> = {
  1: "bg-slate-100 text-slate-700",
  2: "bg-blue-50 text-blue-700",
  3: "bg-amber-50 text-amber-700",
  4: "bg-emerald-50 text-emerald-700",
  5: "bg-red-50 text-red-700",
};
const GROUP_ICON: Record<string, any> = { project: FolderKanban, customer: Building2, lead: Target, other: ListChecks, none: CircleDot };
const GROUP_KIND: Record<string, string> = { project: "Project", customer: "Customer", lead: "Lead", other: "Related", none: "Other" };

const barTone = (p: number) => (p >= 75 ? "bg-emerald-500" : p >= 40 ? "bg-blue-500" : p > 0 ? "bg-amber-500" : "bg-slate-300");
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/** Task descriptions are rich text (HTML) — show them as plain text with line breaks, never as HTML. */
export const descriptionText = (html: string): string => {
  if (!html) return "";
  const withBreaks = String(html)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ");
  let text = withBreaks;
  if (typeof DOMParser !== "undefined") {
    text = new DOMParser().parseFromString(withBreaks, "text/html").body.textContent || "";
  } else {
    text = withBreaks.replace(/<[^>]+>/g, "");
  }
  return text.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
};

function Bar({ value, className = "h-1.5" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className={`w-full ${className} rounded-full bg-muted overflow-hidden`}>
      <div className={`${className} rounded-full ${barTone(v)}`} style={{ width: `${v}%` }} />
    </div>
  );
}

function Stat({ label, value, hint, tone = "text-foreground", active, onClick }: { label: string; value: React.ReactNode; hint?: string; tone?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${onClick ? "hover:border-primary/50 cursor-pointer" : "cursor-default"} ${active ? "border-primary bg-primary/5" : "bg-card"}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-black mt-0.5 ${tone}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </button>
  );
}

function TaskCard({ task, base }: { task: any; base: string }) {
  const [more, setMore] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const desc = descriptionText(task.description);
  const long = desc.length > 220 || desc.split("\n").length > 3;
  const done = task.status === 5;
  return (
    <div className={`rounded-xl border p-3.5 space-y-2 ${task.overdue ? "border-red-200 bg-red-50/40" : done ? "bg-emerald-50/30" : "bg-card"}`}>
      <div className="flex flex-wrap items-start gap-2">
        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> : task.overdue ? <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" /> : <CircleDot className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />}
        <Link to={`${base}/tasks?taskId=${task._id}`} className={`font-semibold text-sm hover:underline flex-1 min-w-[160px] ${done ? "text-muted-foreground" : ""}`}>
          {task.name}
        </Link>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TASK_TONE[task.status] || TASK_TONE[1]}`}>{task.statusLabel}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_TONE[task.priority] || PRIORITY_TONE[2]}`}>{task.priorityLabel}</span>
      </div>

      {desc ? (
        <div className="pl-6">
          <p className={`text-xs text-muted-foreground whitespace-pre-line break-words ${!more && long ? "line-clamp-3" : ""}`}>{desc}</p>
          {long && (
            <button type="button" onClick={() => setMore((v) => !v)} className="text-[11px] font-semibold text-primary hover:underline mt-0.5">
              {more ? "Show less" : "Show full description"}
            </button>
          )}
        </div>
      ) : (
        <p className="pl-6 text-[11px] italic text-muted-foreground/70">No description</p>
      )}

      <div className="pl-6 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Start: <b className="text-foreground font-semibold">{fmtDate(task.startdate)}</b></span>
        <span className={task.overdue ? "text-red-600 font-bold" : task.dueToday ? "text-amber-600 font-bold" : ""}>
          Due: <b className="font-semibold">{fmtDate(task.duedate)}</b>
          {task.overdue ? ` · ${task.daysOverdue} day${task.daysOverdue === 1 ? "" : "s"} overdue` : task.dueToday ? " · due today" : ""}
        </span>
        {done && <span className="text-emerald-700">Completed: <b className="font-semibold">{fmtDate(task.datefinished)}</b></span>}
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{task.hours ? `${hm(task.hours)} h logged` : "No time logged"}</span>
        {task.checklist?.total > 0 && <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />Checklist {task.checklist.done}/{task.checklist.total}</span>}
        {task.comments > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{task.comments} comment{task.comments === 1 ? "" : "s"}</span>}
      </div>

      {task.tags?.length > 0 && (
        <div className="pl-6 flex flex-wrap gap-1">
          {task.tags.map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>)}
        </div>
      )}

      {task.timeLogs?.length > 0 && (
        <div className="pl-6">
          <button type="button" onClick={() => setLogsOpen((v) => !v)} className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
            {logsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Time log ({task.timeLogs.length})
          </button>
          {logsOpen && (
            <div className="mt-1 rounded-lg border divide-y text-[11px]">
              {task.timeLogs.map((l: any, i: number) => (
                <div key={i} className="flex justify-between gap-3 px-2.5 py-1.5">
                  <span>{fmtDate(l.date)}{l.start ? ` · ${clockTime(l.start)}${l.end ? ` – ${clockTime(l.end)}` : ""}` : ""}</span>
                  <b>{hm(l.hours)} h</b>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const matches = (task: any, show: Show) =>
  show === "all" ? true : show === "pending" ? task.status !== 5 : show === "overdue" ? task.overdue : task.status === 5;

export function StaffWorkReportDialog({
  staffId, staffName, period, from = "", to = "", base, open, onOpenChange,
}: {
  staffId: string | null;
  staffName?: string;
  period: string;
  from?: string;
  to?: string;
  base: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [show, setShow] = useState<Show>("all");
  const [search, setSearch] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const companyName = useCompanyName();
  const waiting = needsDate(period, from, to);

  const q = useQuery({
    queryKey: ["staffReport", staffId, period, from, to],
    queryFn: () => utilityService.getStaffReport(staffId, period, from, to),
    enabled: open && !!staffId && !waiting,
  });
  const data: any = q.data || {};
  const s = data.summary || {};
  const person = data.staff || {};
  const name = person.name || staffName || "Staff";

  const st = search.trim().toLowerCase();
  const groups: any[] = useMemo(
    () =>
      (data.groups || [])
        .map((g: any) => ({
          ...g,
          visible: g.tasks.filter((t: any) => matches(t, show) && (!st || `${t.name} ${descriptionText(t.description)} ${g.name}`.toLowerCase().includes(st))),
        }))
        .filter((g: any) => g.visible.length > 0),
    [data.groups, show, st]
  );
  const shownCount = groups.reduce((n, g) => n + g.visible.length, 0);

  const onExport = (kind: ExportKind) => {
    runExport(kind, {
      title: `Work Report — ${name}`,
      subtitle: `Period: ${periodLabel(period, from, to)}`,
      companyName,
      kpis: [
        { label: "Total Tasks", value: String(s.total || 0) },
        { label: "Completed", value: `${s.completed || 0} (${s.progress || 0}%)` },
        { label: "Pending", value: String(s.open || 0) },
        { label: "Overdue", value: String(s.overdue || 0) },
        { label: "Done in Period", value: String(s.completedInPeriod || 0) },
        { label: "Hours Logged", value: hm(s.hours || 0) },
      ],
      sections: (data.groups || []).map((g: any) => ({
        title: `${GROUP_KIND[g.type]}: ${g.name}${g.customer?.name && g.type === "project" ? ` (${g.customer.name})` : ""} — ${g.completed}/${g.total} done${g.hours ? `, ${hm(g.hours)} h` : ""}`,
        headers: ["Task", "Description", "Status", "Priority", "Start", "Due", "Completed", "Hours"],
        rows: g.tasks.map((t: any) => [
          t.name,
          descriptionText(t.description).slice(0, 300),
          t.overdue ? `${t.statusLabel} (overdue ${t.daysOverdue}d)` : t.statusLabel,
          t.priorityLabel,
          fmtDate(t.startdate),
          fmtDate(t.duedate),
          t.status === 5 ? fmtDate(t.datefinished) : "-",
          hm(t.hours || 0),
        ]),
      })),
      fileName: `work_report_${name.replace(/\s+/g, "_").toLowerCase()}`,
    });
  };

  const toggle = (key: string) => setClosed((c) => ({ ...c, [key]: !c[key] }));
  const pick = (v: Show) => setShow((cur) => (cur === v ? "all" : v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Only the body scrolls: the header and the close (X) button stay put,
          and the X sits above the header (it used to hide behind it). */}
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] p-0 md:p-0 gap-0 flex flex-col overflow-hidden [&>button]:z-20 [&>button]:top-3.5 [&>button]:right-3">
        {/* Header */}
        <DialogHeader className="shrink-0 bg-background border-b px-5 py-4 space-y-0 text-left">
          <div className="flex flex-wrap items-center gap-3 pr-10">
            <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0">{initials(name)}</div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold truncate">{name}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {person.role && <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{person.role}</span>}
                  {person.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{person.email}</span>}
                  {person.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{person.phone}</span>}
                  <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{periodLabel(period, from, to)}</span>
                </div>
              </DialogDescription>
            </div>
            <ExportMenu onExport={onExport} disabled={!data.groups} />
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          <LoadError error={q.error} what="this staff report" />
          {waiting && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Choose the date(s) for the period first.</div>}

          {q.isLoading ? <Loading /> : data.groups && (
            <>
              {/* Summary — the cards also filter the task list */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <Stat label="Total Tasks" value={s.total || 0} hint={`${s.activeProjects || 0} active project${s.activeProjects === 1 ? "" : "s"}`} active={show === "all"} onClick={() => setShow("all")} />
                <Stat label="Pending" value={s.open || 0} hint={s.dueToday ? `${s.dueToday} due today` : "not completed"} active={show === "pending"} onClick={() => pick("pending")} />
                <Stat label="Overdue" value={s.overdue || 0} tone={s.overdue ? "text-red-600" : "text-foreground"} hint="past due date" active={show === "overdue"} onClick={() => pick("overdue")} />
                <Stat label="Completed" value={s.completed || 0} tone="text-emerald-600" hint={`${s.completedInPeriod || 0} in this period`} active={show === "done"} onClick={() => pick("done")} />
                <Stat label="Progress" value={`${s.progress || 0}%`} hint="completed of all tasks" />
                <Stat label="Hours Logged" value={hm(s.hours || 0)} hint={s.otherHours ? `${hm(s.otherHours)} h on other work` : "in this period"} />
              </div>
              <div className="rounded-xl border p-3">
                <div className="flex justify-between text-[11px] font-bold text-muted-foreground mb-1">
                  <span>Overall task progress</span>
                  <span className="text-foreground">{s.completed || 0} of {s.total || 0} done</span>
                </div>
                <Bar value={s.progress || 0} className="h-2.5" />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {(["all", "pending", "overdue", "done"] as Show[]).map((v) => (
                  <Button key={v} size="sm" variant={show === v ? "default" : "outline"} className="h-8 rounded-lg text-xs" onClick={() => setShow(v)}>
                    {v === "all" ? "All tasks" : v === "pending" ? "Pending" : v === "overdue" ? "Overdue" : "Completed"}
                  </Button>
                ))}
                <div className="relative ml-auto">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search task, description or project" className="h-8 w-[240px] pl-8 text-xs rounded-lg" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Showing {shownCount} task{shownCount === 1 ? "" : "s"}. Pending tasks are always listed; completed tasks are listed when finished or worked on in this period
                {s.olderCompleted ? ` (${s.olderCompleted} older completed task${s.olderCompleted === 1 ? "" : "s"} are counted but not listed)` : ""}.
              </p>

              {/* Project-wise groups */}
              {groups.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                  {(data.groups || []).length === 0 ? "No tasks are assigned to this staff member." : "No tasks match this filter."}
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((g: any) => {
                    const key = `${g.type}:${g.id}`;
                    const isOpen = !closed[key];
                    const Icon = GROUP_ICON[g.type] || CircleDot;
                    return (
                      <div key={key} className="rounded-2xl border overflow-hidden">
                        <button type="button" onClick={() => toggle(key)} className="w-full text-left bg-muted/40 hover:bg-muted/60 px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                          {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{GROUP_KIND[g.type]}</p>
                            <p className="font-bold text-sm truncate">{g.name}</p>
                            {g.type === "project" && g.customer?.name && <p className="text-[11px] text-muted-foreground truncate">Customer: {g.customer.name}</p>}
                          </div>
                          {g.type === "project" && g.statusLabel && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PROJECT_TONE[g.status] || PROJECT_TONE[1]}`}>{g.statusLabel}</span>
                          )}
                          <div className="w-[170px] max-w-full">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5"><span>{g.completed}/{g.total} done</span><span>{g.progress}%</span></div>
                            <Bar value={g.progress} />
                          </div>
                          <div className="flex gap-3 text-[11px] whitespace-nowrap">
                            <span><b>{g.open}</b> pending</span>
                            {g.overdue > 0 && <span className="text-red-600 font-bold">{g.overdue} overdue</span>}
                            <span className="text-muted-foreground">{hm(g.hours)} h</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="p-3 space-y-2.5">
                            {g.type === "project" && (
                              <div className="flex flex-wrap gap-3 text-[11px] px-1">
                                <Link to={`${base}/projects/view/${g.id}`} className="text-primary font-semibold hover:underline">Open project</Link>
                                {g.customer?.id && <Link to={`${base}/customers/${g.customer.id}`} className="text-primary font-semibold hover:underline">Open customer</Link>}
                                {g.deadline && <span className="text-muted-foreground">Project deadline: <b className="text-foreground">{fmtDate(g.deadline)}</b></span>}
                              </div>
                            )}
                            {g.visible.map((t: any) => <TaskCard key={t._id} task={t} base={base} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

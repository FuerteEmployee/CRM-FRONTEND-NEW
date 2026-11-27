// Reports > Project Work and Reports > Staff Work.
// Built from the company's own tasks, task timers / time entries and the
// activity log, so admins can see who worked on what, when and how much,
// without anyone having to send a separate daily report.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Building2, CheckCircle2, ChevronDown, ChevronRight, Clock, FolderKanban, LayoutDashboard, ListTodo, LogIn, LogOut, Search, Timer, Users } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { reportAllowed } from "@/lib/reportAccess";
import { utilityService } from "@/api/services/utility.service";
import type { ExportKind } from "@/lib/reportExport";
import {
  ExportMenu, runExport, FilterLabel, PeriodFilter, Kpi, LoadError, Loading, isForbidden,
  useCompanyName, fmtDate, toList, PERIODS, periodLabel, needsDate, hm, clockTime, clockSpan, OwnRecordsNote,
} from "./ReportPages";

// ── Small shared pieces ─────────────────────────────────────────────────────

const PROJECT_STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "1", label: "Not Started" },
  { value: "2", label: "In Progress" },
  { value: "3", label: "On Hold" },
  { value: "4", label: "Finished" },
  { value: "5", label: "Cancelled" },
];
const statusTone: Record<number, string> = {
  1: "bg-slate-100 text-slate-700 border-slate-200",
  2: "bg-blue-50 text-blue-700 border-blue-200",
  3: "bg-amber-50 text-amber-700 border-amber-200",
  4: "bg-emerald-50 text-emerald-700 border-emerald-200",
  5: "bg-red-50 text-red-700 border-red-200",
};
const barTone = (p: number) => (p >= 75 ? "bg-emerald-500" : p >= 40 ? "bg-blue-500" : p > 0 ? "bg-amber-500" : "bg-slate-300");

/** A labelled progress bar: 0-100. */
function ProgressBar({ value, label, sub, size = "md", tone }: { value: number; label?: string; sub?: string; size?: "sm" | "md" | "lg"; tone?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const h = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="w-full">
      {(label || sub) && (
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
          <span className="text-[11px] font-black">{sub ?? `${v}%`}</span>
        </div>
      )}
      <div className={`w-full ${h} rounded-full bg-muted overflow-hidden`}>
        <div className={`${h} rounded-full transition-all ${tone || barTone(v)}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

const useBase = () => (useLocation().pathname.startsWith("/staff") ? "/staff" : "/admin");
const dateTime = (v: any) => (v ? `${fmtDate(v)} ${clockTime(v)}` : "-");
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

// ════════════════════════════════════════════════════════════════════════════
// Navigation between the work reports (same bar on every one of them)
// ════════════════════════════════════════════════════════════════════════════

type WorkPage = "overview" | "staff-work" | "project-work" | "customer-work";
const WORK_PAGES: { key: WorkPage; label: string; path: string; slug: string | null; icon: any }[] = [
  { key: "overview", label: "Work Overview", path: "/reports/master", slug: null, icon: LayoutDashboard },
  { key: "staff-work", label: "Staff Work (daily)", path: "/reports/staff-work", slug: "staff-work", icon: Users },
  { key: "project-work", label: "Project Work", path: "/reports/project-work", slug: "project-work", icon: FolderKanban },
  { key: "customer-work", label: "Customer Work", path: "/reports/customer-work", slug: "customer-work", icon: Building2 },
];

/** Buttons to jump between Work Overview / Staff Work / Project Work / Customer Work. */
export function WorkReportLinks({ current }: { current: WorkPage }) {
  const base = useBase();
  const { canView } = usePermissions();
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Work reports">
      {WORK_PAGES.filter((p) => reportAllowed(p.slug, canView)).map((p) => {
        const Icon = p.icon;
        const active = p.key === current;
        return (
          <Button key={p.key} asChild size="sm" variant={active ? "default" : "outline"} className="rounded-lg text-xs">
            <Link to={base + p.path} aria-current={active ? "page" : undefined}><Icon className="h-3.5 w-3.5 mr-1.5" />{p.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}

/**
 * Header used by Staff Work / Project Work / Customer Work:
 *  1. title + description on the left, the Export button on the right;
 *  2. the Work Overview / Staff / Project / Customer buttons;
 *  3. one filter bar — the page's filters, then Search taking the remaining width.
 */
function WorkPageHeader({
  title, description, current, onExport, exportDisabled, search, setSearch, searchPlaceholder, children,
}: {
  title: string; description: string; current: WorkPage; onExport: (k: ExportKind) => void; exportDisabled?: boolean;
  search: string; setSearch: (v: string) => void; searchPlaceholder: string; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm font-medium">{description}</p>
        </div>
        <div className="shrink-0 self-start">
          <ExportMenu onExport={onExport} disabled={exportDisabled} />
        </div>
      </div>
      <WorkReportLinks current={current} />
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-wrap items-end gap-3" role="search" aria-label={`${title} filters`}>
            {children}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
              <FilterLabel>Search</FilterLabel>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} aria-label="Search" className="h-9 w-full pl-9 text-xs rounded-lg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Project Work Report
// ════════════════════════════════════════════════════════════════════════════

export const ReportProjectWork = () => {
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"projects" | "staff" | "timeline">("projects");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const companyName = useCompanyName();
  const base = useBase();

  const waiting = needsDate(period, from, to);
  const q = useQuery({
    queryKey: ["projectWorkReport", period, from, to, status],
    queryFn: () => utilityService.getProjectWorkReport(period, from, to, status),
    enabled: !waiting,
    retry: (n: number, e: any) => !isForbidden(e) && n < 1,
  });
  const data: any = q.data || {};
  const s = data.summary || {};
  const term = search.trim().toLowerCase();
  const allProjects: any[] = toList(data.projects);
  // Search: project, customer or staff name.
  const projects: any[] = allProjects.filter((p: any) => !term || [p.name, p.client, ...p.staff.map((m: any) => m.name)].join(" ").toLowerCase().includes(term));

  // Staff-wise: every staff member with the projects they are on / worked on.
  const byStaff = useMemo(() => {
    const m = new Map<string, any>();
    allProjects.forEach((p: any) => p.staff.forEach((st: any) => {
      const r = m.get(st.staffId) || { staffId: st.staffId, name: st.name, projects: [], tasks: 0, completed: 0, completedInPeriod: 0, hours: 0, open: 0 };
      r.projects.push({ ...st, project: p });
      r.tasks += st.tasks; r.completed += st.completed; r.completedInPeriod += st.completedInPeriod; r.hours += st.hours; r.open += st.tasks - st.completed;
      m.set(st.staffId, r);
    }));
    return [...m.values()]
      .map((r) => ({ ...r, progress: r.tasks ? Math.round((r.completed / r.tasks) * 100) : 0, projects: r.projects.sort((a: any, b: any) => a.project.status - b.project.status || b.tasks - a.tasks) }))
      .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
  }, [allProjects]);
  const staffShown = byStaff.filter((r) => !term || [r.name, ...r.projects.map((x: any) => x.project.name + " " + x.project.client)].join(" ").toLowerCase().includes(term));
  const shownIds = new Set(projects.map((p) => String(p._id)));
  const timeline: any[] = toList(data.timeline).filter((e: any) => shownIds.has(String(e.projectId)));

  const timelineByDay = useMemo(() => {
    const m = new Map<string, any[]>();
    timeline.forEach((e) => {
      const k = fmtDate(e.at);
      m.set(k, [...(m.get(k) || []), e]);
    });
    return [...m.entries()];
  }, [timeline]);

  const allOpen = projects.length > 0 && projects.every((p) => open[p._id]);
  const toggleAll = () => setOpen(allOpen ? {} : Object.fromEntries(projects.map((p) => [p._id, true])));

  const onExport = (kind: ExportKind) => {
    runExport(kind, {
      title: "Project Work Report",
      subtitle: [`Period: ${periodLabel(period, from, to)}`, status !== "all" ? `Status: ${PROJECT_STATUSES.find((x) => x.value === status)?.label}` : "", term ? `Search: ${search.trim()}` : ""].filter(Boolean).join(" · "),
      companyName,
      kpis: [
        { label: "Projects", value: String(projects.length) },
        { label: "Tasks Done", value: `${s.completedTasks || 0} / ${s.totalTasks || 0}` },
        { label: "Done in Period", value: String(s.completedInPeriod || 0) },
        { label: "Overdue Tasks", value: String(s.overdueTasks || 0) },
        { label: "Hours in Period", value: hm(s.hours || 0) },
      ],
      sections: [
        {
          title: "Projects",
          headers: ["Project", "Customer", "Status", "Deadline", "Progress", "Tasks Done", "Overdue", "Done in Period", "Hours (h:m)", "Estimated (h)"],
          rows: projects.map((p) => [p.name, p.client || "-", p.statusLabel, fmtDate(p.deadline), `${p.progress}%`, `${p.completedTasks} / ${p.totalTasks}`, p.overdueTasks, p.completedInPeriod, hm(p.hours), p.estimatedHours || "-"]),
        },
        {
          title: "Work by Staff",
          headers: ["Project", "Staff", "Tasks", "Completed", "Progress", "Done in Period", "Hours (h:m)", "Last Work"],
          rows: projects.flatMap((p) => p.staff.map((m: any) => [p.name, m.name, m.tasks, m.completed, `${m.progress}%`, m.completedInPeriod, hm(m.hours), dateTime(m.lastWork)])),
        },
        {
          title: "Projects by Staff",
          headers: ["Staff", "Project", "Customer", "Project Progress", "Their Tasks Done", "Hours (h:m)"],
          rows: staffShown.flatMap((r) => r.projects.map((x: any) => [r.name, x.project.name, x.project.client || "-", x.project.progress + "%", x.completed + " / " + x.tasks, hm(x.hours)])),
        },
        {
          title: "Timeline",
          headers: ["Date", "Time", "Staff", "Project", "Task", "Work"],
          rows: timeline.map((e) => [fmtDate(e.at), e.type === "time" ? clockSpan(e.at, e.end) : clockTime(e.at), e.staff, e.project, e.task, e.type === "completed" ? "Completed the task" : `Worked ${hm(e.hours)}`]),
        },
      ],
      fileName: "project_work_report",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <WorkPageHeader
          title="Project Work Report"
          description="How far each project has got, and who did how much work on it"
          current="project-work"
          onExport={onExport}
          exportDisabled={q.isLoading || waiting}
          search={search}
          setSearch={setSearch}
          searchPlaceholder="Project, customer or staff"
        >
            <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
            <div className="flex flex-col gap-1.5">
              <FilterLabel>Status</FilterLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>{PROJECT_STATUSES.map((x) => <SelectItem key={x.value} value={x.value} className="text-xs">{x.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
        </WorkPageHeader>

        <LoadError error={q.error} what="the Project Work report" />
        {waiting && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{period === "date" ? "Choose the date." : "Choose a From or To date for the custom period."}</div>}
        {data.access?.level === "own" && <OwnRecordsNote what={`Projects (projects you are on or worked on${data.access?.allStaff ? "" : "; only your own hours"})`} />}

        {isForbidden(q.error) ? null : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi label="Projects" value={q.isLoading ? "…" : projects.length} hint={`${s.inProgress || 0} in progress`} />
              <Kpi label="Overall Progress" value={q.isLoading ? "…" : `${s.totalTasks ? Math.round(((s.completedTasks || 0) / s.totalTasks) * 100) : 0}%`} hint="of all project tasks" />
              <Kpi label="Tasks Done" value={q.isLoading ? "…" : `${s.completedTasks || 0} / ${s.totalTasks || 0}`} tone="text-emerald-600" />
              <Kpi label="Done in Period" value={q.isLoading ? "…" : s.completedInPeriod || 0} hint={periodLabel(period, from, to)} />
              <Kpi label="Overdue Tasks" value={q.isLoading ? "…" : s.overdueTasks || 0} tone={s.overdueTasks ? "text-red-600" : "text-foreground"} />
              <Kpi label="Hours Logged" value={q.isLoading ? "…" : hm(s.hours || 0)} hint="hours:minutes in period" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant={view === "projects" ? "default" : "outline"} className="rounded-lg" onClick={() => setView("projects")}><FolderKanban className="h-4 w-4 mr-1.5" />Projects</Button>
              <Button size="sm" variant={view === "staff" ? "default" : "outline"} className="rounded-lg" onClick={() => setView("staff")}><Users className="h-4 w-4 mr-1.5" />By Staff</Button>
              <Button size="sm" variant={view === "timeline" ? "default" : "outline"} className="rounded-lg" onClick={() => setView("timeline")}><Clock className="h-4 w-4 mr-1.5" />Who did what, when</Button>
              {view === "projects" && projects.length > 0 && (
                <Button size="sm" variant="ghost" className="rounded-lg ml-auto text-xs" onClick={toggleAll}>{allOpen ? "Collapse all" : "Show staff for all"}</Button>
              )}
            </div>

            {q.isLoading ? <Loading /> : view === "staff" ? (
              staffShown.length === 0 ? (
                <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">No staff on these projects.</CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {staffShown.map((r) => (
                    <Card key={r.staffId} className="rounded-2xl border-border/60 shadow-sm">
                      <CardContent className="p-4 md:p-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black shrink-0">{initials(r.name)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground">{r.projects.length} project{r.projects.length === 1 ? "" : "s"} · {r.open} task{r.open === 1 ? "" : "s"} pending · {r.completedInPeriod} done in period · {hm(r.hours)} h</p>
                          </div>
                        </div>
                        <ProgressBar value={r.progress} label="Their tasks on these projects" sub={r.completed + " / " + r.tasks + " done"} />
                        <div className="rounded-lg border divide-y">
                          {r.projects.map((x: any) => (
                            <div key={x.project._id} className="px-3 py-2.5 space-y-1.5">
                              <div className="flex items-center gap-2 text-xs">
                                <Link to={base + "/projects/view/" + x.project._id} className="font-bold hover:underline truncate">{x.project.name}</Link>
                                <Badge variant="outline" className={"rounded-full text-[9px] font-bold " + (statusTone[x.project.status] || "")}>{x.project.statusLabel}</Badge>
                                <span className="text-muted-foreground truncate">{x.project.client}</span>
                                <span className="ml-auto whitespace-nowrap text-muted-foreground">their tasks <b className="text-foreground">{x.completed}/{x.tasks}</b> · {hm(x.hours)} h</span>
                              </div>
                              <ProgressBar size="sm" value={x.project.progress} />
                              <p className="text-[10px] text-muted-foreground">Project {x.project.progress}% complete{x.project.overdueTasks ? " · " + x.project.overdueTasks + " overdue" : ""}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : view === "projects" ? (
              projects.length === 0 ? (
                <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">No projects for the selected filters.</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {projects.map((p) => {
                    const isOpen = !!open[p._id];
                    return (
                      <Card key={p._id} className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
                        <CardContent className="p-4 md:p-5">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="lg:w-[30%] min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link to={`${base}/projects/view/${p._id}`} className="font-bold text-sm hover:underline truncate">{p.name}</Link>
                                <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${statusTone[p.status] || ""}`}>{p.statusLabel}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{p.client || "No customer"}</p>
                              <p className={`text-[11px] mt-1 ${p.overdueProject ? "text-red-600 font-bold" : "text-muted-foreground"}`}>
                                {p.deadline ? `Deadline: ${fmtDate(p.deadline)}${p.overdueProject ? " (passed)" : ""}` : "No deadline"}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <ProgressBar
                                size="lg"
                                value={p.progress}
                                label={p.progressFrom === "tasks" ? `${p.completedTasks} of ${p.totalTasks} tasks complete` : "Progress (set on the project — no tasks yet)"}
                                sub={`${p.progress}%`}
                              />
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                                <span><b className="text-foreground">{p.openTasks}</b> open</span>
                                <span className={p.overdueTasks ? "text-red-600 font-bold" : ""}><b>{p.overdueTasks}</b> overdue</span>
                                <span><b className="text-foreground">{p.completedInPeriod}</b> done in period</span>
                                <span><b className="text-foreground">{hm(p.hours)}</b> h logged{p.estimatedHours ? ` / ${p.estimatedHours} h estimated` : ""}</span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="rounded-lg text-xs shrink-0" onClick={() => setOpen({ ...open, [p._id]: !isOpen })}>
                              {isOpen ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}Staff ({p.staff.length})
                            </Button>
                          </div>

                          {isOpen && (
                            <div className="mt-4 border-t pt-3 overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {["Staff", "Task Progress", "Tasks Done", "Done in Period", "Hours (h:m)", "Last Work"].map((h) => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {p.staff.length === 0 ? <TableEmpty colSpan={6}>No one has tasks or logged time on this project yet.</TableEmpty> : p.staff.map((m: any) => (
                                    <TableRow key={m.staffId}>
                                      <TableCell className="font-medium whitespace-nowrap">{m.name}</TableCell>
                                      <TableCell className="min-w-[160px]"><ProgressBar size="sm" value={m.progress} /><span className="text-[10px] text-muted-foreground">{m.progress}%</span></TableCell>
                                      <TableCell>{m.completed} / {m.tasks}</TableCell>
                                      <TableCell>{m.completedInPeriod}</TableCell>
                                      <TableCell className="font-bold">{hm(m.hours)}</TableCell>
                                      <TableCell className="text-muted-foreground whitespace-nowrap">{dateTime(m.lastWork)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            ) : (
              <Card className="rounded-2xl overflow-hidden">
                <CardHeader className="border-b py-3 px-5"><CardTitle className="text-sm font-bold">Who did what, when — {periodLabel(period, from, to)}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  {timelineByDay.length === 0 ? (
                    <div className="p-10 text-center text-sm text-muted-foreground">No tasks completed and no time logged in this period.</div>
                  ) : timelineByDay.map(([day, items]) => (
                    <div key={day} className="border-b last:border-b-0">
                      <div className="px-5 py-2 bg-muted/40 text-xs font-black uppercase tracking-wider text-muted-foreground">{day}</div>
                      <div className="divide-y">
                        {items.map((e, i) => (
                          <div key={i} className="px-5 py-2.5 flex items-start gap-3 text-sm">
                            {e.type === "completed"
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                              : <Timer className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />}
                            <div className="w-[150px] shrink-0 text-xs text-muted-foreground pt-0.5">{e.type === "time" ? clockSpan(e.at, e.end) : clockTime(e.at)}</div>
                            <div className="min-w-0">
                              <span className="font-bold">{e.staff}</span>{" "}
                              {e.type === "completed" ? <>completed <b>{e.task}</b></> : <>worked <b>{hm(e.hours)}</b> on <b>{e.task}</b></>}
                              <span className="text-muted-foreground"> · {e.project}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Staff Work Report (daily by default)
// ════════════════════════════════════════════════════════════════════════════

const STAFF_PERIODS = PERIODS.filter((p) => !["all_time", "this_year", "last_year", "this_quarter"].includes(p.value));

export const ReportStaffWork = () => {
  const [params] = useSearchParams();
  const urlDate = params.get("date") || "";
  const [period, setPeriod] = useState(urlDate ? "date" : "today");
  const [from, setFrom] = useState(urlDate);
  const [to, setTo] = useState("");
  const [staffId, setStaffId] = useState(params.get("staff") || "all");
  const [show, setShow] = useState<"all" | "pending" | "idle">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>(params.get("staff") ? { [params.get("staff") as string]: true } : {});
  const companyName = useCompanyName();

  const waiting = needsDate(period, from, to);
  const q = useQuery({
    queryKey: ["staffWorkReport", period, from, to],
    queryFn: () => utilityService.getStaffWorkReport(period, from, to),
    enabled: !waiting,
    retry: (n: number, e: any) => !isForbidden(e) && n < 1,
  });
  const data: any = q.data || {};
  const allStaffRows: any[] = toList(data.staff);
  const rows = allStaffRows
    .filter((r) => staffId === "all" || r.staffId === staffId)
    .filter((r) => show === "all" || (show === "pending" ? r.pendingCount > 0 : r.noWork))
    .filter((r) => !search.trim() || [r.name, r.email, ...r.projects, ...r.entries.map((e: any) => e.task), ...r.completed.map((c: any) => c.task), ...r.pending.map((x: any) => x.task)].join(" ").toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(a.noWork) - Number(b.noWork) || b.hours - a.hours || b.completedCount - a.completedCount);
  const sum = (k: string) => rows.reduce((t, r) => t + (Number(r[k]) || 0), 0);
  const working = rows.filter((r) => !r.noWork).length;
  const days = data.days || 1;
  const singleDay = days <= 1;

  const onExport = (kind: ExportKind) => {
    const who = staffId === "all" ? "" : `Staff: ${allStaffRows.find((r) => r.staffId === staffId)?.name || ""}`;
    runExport(kind, {
      title: "Staff Work Report",
      subtitle: [`Period: ${periodLabel(period, from, to)}`, who, show === "pending" ? "Only staff with pending tasks" : show === "idle" ? "Only staff with no work recorded" : ""].filter(Boolean).join(" · "),
      companyName,
      kpis: [
        { label: "Staff", value: String(rows.length) },
        { label: "Worked", value: `${working} / ${rows.length}` },
        { label: "Hours Logged", value: hm(sum("hours")) },
        { label: "Tasks Completed", value: String(sum("completedCount")) },
        { label: "Due / Overdue Now", value: String(sum("pendingCount")) },
      ],
      sections: [
        {
          title: "Summary by Staff",
          headers: ["Staff", "Hours (h:m)", `Target (${data.hoursPerDay || 8}h/day)`, "Tasks Completed", "Due / Overdue Now", "First Login", "Last Logout", "First Activity", "Last Activity", "Projects"],
          rows: rows.map((r) => [r.name, hm(r.hours), `${r.targetHours}h`, r.completedCount, r.pendingCount, dateTime(r.firstLogin), dateTime(r.lastLogout), dateTime(r.firstActivity), dateTime(r.lastActivity), r.projects.join(", ") || "-"]),
          footer: ["Total", hm(sum("hours")), "", sum("completedCount"), sum("pendingCount"), "", "", "", "", ""],
        },
        {
          title: "Work Log (time on tasks)",
          headers: ["Staff", "Date", "Start – End", "Task", "Project", "Hours (h:m)"],
          rows: rows.flatMap((r) => r.entries.map((e: any) => [r.name, fmtDate(e.date), clockSpan(e.start, e.end), e.task, e.project || "-", hm(e.hours)])),
        },
        {
          title: "Tasks Completed",
          headers: ["Staff", "Completed At", "Task", "Project"],
          rows: rows.flatMap((r) => r.completed.map((c: any) => [r.name, dateTime(c.at), c.task, c.project || "-"])),
        },
        {
          title: "Tasks Due Today or Overdue (not complete)",
          headers: ["Staff", "Task", "Project", "Due Date", "Status"],
          rows: rows.flatMap((r) => r.pending.map((x: any) => [r.name, x.task, x.project || "-", fmtDate(x.duedate), x.status])),
        },
      ],
      fileName: `staff_work_${period === "date" ? from : period}`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <WorkPageHeader
          title="Staff Work Report"
          description="What each staff member did — time on tasks, tasks completed, login / logout and what is still pending"
          current="staff-work"
          onExport={onExport}
          exportDisabled={q.isLoading || waiting}
          search={search}
          setSearch={setSearch}
          searchPlaceholder="Staff, task or project"
        >
            <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} options={STAFF_PERIODS} />
            {data.access?.allStaff && (
              <div className="flex flex-col gap-1.5">
                <FilterLabel>Staff</FilterLabel>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger className="w-[170px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Staff</SelectItem>
                    {allStaffRows.map((r) => <SelectItem key={r.staffId} value={r.staffId} className="text-xs">{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <FilterLabel>Show</FilterLabel>
              <Select value={show} onValueChange={(v) => setShow(v as any)}>
                <SelectTrigger className="w-[170px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Everyone</SelectItem>
                  <SelectItem value="pending" className="text-xs">With pending tasks</SelectItem>
                  <SelectItem value="idle" className="text-xs">No work recorded</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </WorkPageHeader>

        <LoadError error={q.error} what="the Staff Work report" />
        {waiting && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{period === "date" ? "Choose the date." : "Choose a From or To date for the custom period."}</div>}
        {data.access && !data.access.allStaff && <OwnRecordsNote what="Staff Work (to see all staff, your role needs Reports > View Timesheets Report)" />}

        {isForbidden(q.error) ? null : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Kpi label="Staff" value={q.isLoading ? "…" : rows.length} />
              <Kpi label="Worked" value={q.isLoading ? "…" : `${working} / ${rows.length}`} hint="logged time, completed a task or used the CRM" tone="text-emerald-600" />
              <Kpi label="Hours Logged" value={q.isLoading ? "…" : hm(sum("hours"))} hint="hours:minutes on task timers / timesheets" />
              <Kpi label="Tasks Completed" value={q.isLoading ? "…" : sum("completedCount")} />
              <Kpi label="Due / Overdue Now" value={q.isLoading ? "…" : sum("pendingCount")} tone={sum("pendingCount") ? "text-red-600" : "text-foreground"} hint="assigned, not complete" />
            </div>

            {q.isLoading ? <Loading /> : rows.length === 0 ? (
              <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">No staff for the selected filters.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {rows.map((r) => {
                  const isOpen = !!open[r.staffId];
                  return (
                    <Card key={r.staffId} className={`rounded-2xl shadow-sm overflow-hidden ${r.noWork ? "border-red-200" : "border-border/60"}`}>
                      <CardContent className="p-4 md:p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black shrink-0">{initials(r.name)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{r.name}</span>
                              {r.isAdmin && <Badge variant="outline" className="text-[10px] rounded-full">Admin</Badge>}
                              {r.noWork && <Badge variant="outline" className="text-[10px] rounded-full bg-red-50 text-red-700 border-red-200">No work recorded</Badge>}
                              {r.pendingCount > 0 && <Badge variant="outline" className="text-[10px] rounded-full bg-amber-50 text-amber-700 border-amber-200">{r.pendingCount} due / overdue</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><LogIn className="h-3.5 w-3.5" />First login: <b className="text-foreground">{r.firstLogin ? (singleDay ? clockTime(r.firstLogin) : dateTime(r.firstLogin)) : "-"}</b></span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><LogOut className="h-3.5 w-3.5" />Last logout: <b className="text-foreground">{r.lastLogout ? (singleDay ? clockTime(r.lastLogout) : dateTime(r.lastLogout)) : "-"}</b></span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="h-3.5 w-3.5" />Active: <b className="text-foreground">{r.firstActivity ? `${singleDay ? clockTime(r.firstActivity) : dateTime(r.firstActivity)} – ${singleDay ? clockTime(r.lastActivity) : dateTime(r.lastActivity)}` : "-"}</b></span>
                          <span className="flex items-center gap-1.5 text-muted-foreground"><ListTodo className="h-3.5 w-3.5" />CRM actions: <b className="text-foreground">{r.actions}</b></span>
                        </div>

                        <div className="space-y-3">
                          <ProgressBar value={r.hoursProgress} label="Time on tasks" sub={`${hm(r.hours)} of ${r.targetHours}h`} />
                          <ProgressBar value={r.taskProgress} label="Tasks" sub={`${r.completedCount} done · ${r.pendingCount} due/overdue`} tone={r.completedCount + r.pendingCount === 0 ? "bg-slate-300" : undefined} />
                        </div>

                        {r.projects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {r.projects.map((p: string) => <Badge key={p} variant="secondary" className="text-[10px] rounded-full font-medium">{p}</Badge>)}
                          </div>
                        )}

                        <Button variant="outline" size="sm" className="rounded-lg text-xs w-full" onClick={() => setOpen({ ...open, [r.staffId]: !isOpen })}>
                          {isOpen ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                          {isOpen ? "Hide details" : `Details (${r.entries.length} time entries · ${r.completed.length} completed · ${r.pending.length} pending)`}
                        </Button>

                        {isOpen && (
                          <div className="space-y-4 text-xs">
                            <div>
                              <p className="font-black uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Work log</p>
                              {r.entries.length === 0 ? <p className="text-muted-foreground">No time logged.</p> : (
                                <div className="rounded-lg border divide-y">
                                  {r.entries.map((e: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2">
                                      <span className="w-[140px] shrink-0 text-muted-foreground">{singleDay ? clockSpan(e.start, e.end) : `${fmtDate(e.date)} ${e.start ? clockSpan(e.start, e.end) : ""}`}</span>
                                      <span className="flex-1 min-w-0 truncate"><b>{e.task}</b>{e.project ? <span className="text-muted-foreground"> · {e.project}</span> : null}</span>
                                      <span className="font-bold">{hm(e.hours)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Tasks completed</p>
                              {r.completed.length === 0 ? <p className="text-muted-foreground">None.</p> : (
                                <div className="rounded-lg border divide-y">
                                  {r.completed.map((c: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                      <span className="w-[120px] shrink-0 text-muted-foreground">{singleDay ? clockTime(c.at) : dateTime(c.at)}</span>
                                      <span className="flex-1 min-w-0 truncate"><b>{c.task}</b>{c.project ? <span className="text-muted-foreground"> · {c.project}</span> : null}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Due today or overdue (not complete)</p>
                              {r.pending.length === 0 ? <p className="text-muted-foreground">Nothing pending.</p> : (
                                <div className="rounded-lg border divide-y">
                                  {r.pending.map((x: any) => (
                                    <div key={x._id} className="flex items-center gap-3 px-3 py-2">
                                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <span className="flex-1 min-w-0 truncate"><b>{x.task}</b>{x.project ? <span className="text-muted-foreground"> · {x.project}</span> : null}</span>
                                      <span className="text-muted-foreground whitespace-nowrap">Due {fmtDate(x.duedate)} · {x.status}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Customer Work Report
// ════════════════════════════════════════════════════════════════════════════

export const ReportCustomerWork = () => {
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [show, setShow] = useState<"all" | "pending" | "overdue" | "done">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const companyName = useCompanyName();
  const base = useBase();

  const waiting = needsDate(period, from, to);
  const q = useQuery({
    queryKey: ["customerWorkReport", period, from, to],
    queryFn: () => utilityService.getCustomerWorkReport(period, from, to),
    enabled: !waiting,
    retry: (n: number, e: any) => !isForbidden(e) && n < 1,
  });
  const data: any = q.data || {};
  const s = data.summary || {};
  const term = search.trim().toLowerCase();
  const rows: any[] = toList(data.customers)
    .filter((c: any) => show === "all" || (show === "pending" ? c.open > 0 : show === "overdue" ? c.overdue > 0 : c.open === 0))
    .filter((c: any) => !term || [c.name, ...c.projectList.map((p: any) => p.name), ...c.staff.map((m: any) => m.name)].join(" ").toLowerCase().includes(term));
  const overall = s.totalTasks ? Math.round(((s.completed || 0) / s.totalTasks) * 100) : 0;

  const onExport = (kind: ExportKind) => {
    runExport(kind, {
      title: "Customer Work Report",
      subtitle: [`Period: ${periodLabel(period, from, to)}`, show !== "all" ? `Show: ${show}` : "", term ? `Search: ${search.trim()}` : ""].filter(Boolean).join(" · "),
      companyName,
      kpis: [
        { label: "Customers", value: String(s.customers || 0) },
        { label: "With Pending Work", value: String(s.withPending || 0) },
        { label: "Tasks Done", value: `${s.completed || 0} / ${s.totalTasks || 0}` },
        { label: "Overdue", value: String(s.overdue || 0) },
        { label: "Hours in Period", value: hm(s.hours || 0) },
      ],
      sections: [
        {
          title: "Customers",
          headers: ["Customer", "Projects (active)", "Progress", "Tasks Done", "Pending", "Overdue", "Due Today", "Done in Period", "Hours (h:m)", "Last Work"],
          rows: rows.map((c) => [c.name, `${c.projects} (${c.activeProjects})`, `${c.progress}%`, `${c.completed} / ${c.totalTasks}`, c.open, c.overdue, c.dueToday, c.completedInPeriod, hm(c.hours), dateTime(c.lastWork)]),
        },
        {
          title: "Projects by Customer",
          headers: ["Customer", "Project", "Status", "Deadline", "Progress", "Tasks Done", "Overdue"],
          rows: rows.flatMap((c) => c.projectList.map((p: any) => [c.name, p.name, p.statusLabel, fmtDate(p.deadline), `${p.progress}%`, `${p.completed} / ${p.total}`, p.overdue])),
        },
        {
          title: "Staff by Customer",
          headers: ["Customer", "Staff", "Pending Tasks", "Completed Tasks"],
          rows: rows.flatMap((c) => c.staff.map((m: any) => [c.name, m.name, m.open, m.completed])),
        },
      ],
      fileName: "customer_work_report",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-12">
        <WorkPageHeader
          title="Customer Work Report"
          description="For every customer: how much work is done, how much is pending, and who is working on it"
          current="customer-work"
          onExport={onExport}
          exportDisabled={q.isLoading || waiting}
          search={search}
          setSearch={setSearch}
          searchPlaceholder="Customer, project or staff"
        >
            <PeriodFilter period={period} setPeriod={setPeriod} from={from} setFrom={setFrom} to={to} setTo={setTo} />
            <div className="flex flex-col gap-1.5">
              <FilterLabel>Show</FilterLabel>
              <Select value={show} onValueChange={(v) => setShow(v as any)}>
                <SelectTrigger className="w-[200px] h-9 rounded-lg text-xs font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All customers with work</SelectItem>
                  <SelectItem value="pending" className="text-xs">With pending work</SelectItem>
                  <SelectItem value="overdue" className="text-xs">With overdue tasks</SelectItem>
                  <SelectItem value="done" className="text-xs">All work done</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </WorkPageHeader>

        <LoadError error={q.error} what="the Customer Work report" />
        {waiting && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{period === "date" ? "Choose the date." : "Choose a From or To date for the custom period."}</div>}
        {data.access && !data.access.full && <OwnRecordsNote what="Customers (only the projects and tasks you are part of)" />}

        {isForbidden(q.error) ? null : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <Kpi label="Customers" value={q.isLoading ? "…" : s.customers || 0} hint={`${s.withWork || 0} have projects / tasks`} />
              <Kpi label="With Pending Work" value={q.isLoading ? "…" : s.withPending || 0} tone={s.withPending ? "text-amber-600" : "text-foreground"} />
              <Kpi label="Tasks Done" value={q.isLoading ? "…" : `${s.completed || 0} / ${s.totalTasks || 0}`} tone="text-emerald-600" />
              <Kpi label="Pending Tasks" value={q.isLoading ? "…" : s.open || 0} />
              <Kpi label="Overdue" value={q.isLoading ? "…" : s.overdue || 0} tone={s.overdue ? "text-red-600" : "text-foreground"} />
              <Kpi label="Hours Logged" value={q.isLoading ? "…" : hm(s.hours || 0)} hint={periodLabel(period, from, to)} />
            </div>

            <Card className="rounded-2xl"><CardContent className="p-4"><ProgressBar size="lg" value={overall} label="All customer work (project + customer tasks)" sub={`${overall}% · ${s.completed || 0} of ${s.totalTasks || 0} tasks complete`} /></CardContent></Card>

            {q.isLoading ? <Loading /> : rows.length === 0 ? (
              <Card className="rounded-2xl"><CardContent className="p-10 text-center text-sm text-muted-foreground">No customers for the selected filters.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {rows.map((c) => {
                  const isOpen = !!open[c._id];
                  return (
                    <Card key={c._id} className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
                      <CardContent className="p-4 md:p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          <div className="lg:w-[28%] min-w-0 flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0"><Building2 className="h-4 w-4" /></div>
                            <div className="min-w-0">
                              <Link to={`${base}/customers/${c._id}`} className="font-bold text-sm hover:underline truncate block">{c.name}</Link>
                              <p className="text-[11px] text-muted-foreground">{c.projects} project{c.projects === 1 ? "" : "s"} ({c.activeProjects} active) · {c.staff.length} staff</p>
                              {c.lastWork && <p className="text-[11px] text-muted-foreground">Last work: {dateTime(c.lastWork)}</p>}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <ProgressBar size="lg" value={c.progress} label={`${c.completed} of ${c.totalTasks} tasks complete`} sub={`${c.progress}%`} />
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                              <span><b className="text-foreground">{c.open}</b> pending</span>
                              <span className={c.overdue ? "text-red-600 font-bold" : ""}><b>{c.overdue}</b> overdue</span>
                              <span><b className="text-foreground">{c.dueToday}</b> due today</span>
                              <span><b className="text-foreground">{c.completedInPeriod}</b> done in period</span>
                              <span><b className="text-foreground">{hm(c.hours)}</b> h logged</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="rounded-lg text-xs shrink-0" onClick={() => setOpen({ ...open, [c._id]: !isOpen })}>
                            {isOpen ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}Details
                          </Button>
                        </div>
                        {isOpen && (
                          <div className="mt-4 border-t pt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-black uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Projects</p>
                              {c.projectList.length === 0 ? <p className="text-muted-foreground">No projects — tasks are on the customer directly.</p> : (
                                <div className="rounded-lg border divide-y">
                                  {c.projectList.map((p: any) => (
                                    <div key={p._id} className="px-3 py-2 space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <Link to={`${base}/projects/view/${p._id}`} className="font-bold hover:underline truncate">{p.name}</Link>
                                        <Badge variant="outline" className={`rounded-full text-[9px] font-bold ${statusTone[p.status] || ""}`}>{p.statusLabel}</Badge>
                                        <span className="ml-auto text-muted-foreground whitespace-nowrap">{p.completed}/{p.total} · {p.progress}%</span>
                                      </div>
                                      <ProgressBar size="sm" value={p.progress} />
                                      {(p.overdue > 0 || p.deadline) && <p className="text-[10px] text-muted-foreground">{p.deadline ? `Deadline ${fmtDate(p.deadline)}` : ""}{p.overdue ? ` · ${p.overdue} overdue` : ""}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-black uppercase tracking-wider text-[10px] text-muted-foreground mb-1.5">Staff working for this customer</p>
                              {c.staff.length === 0 ? <p className="text-muted-foreground">No tasks are assigned to anyone yet.</p> : (
                                <div className="rounded-lg border divide-y">
                                  {c.staff.map((m: any) => {
                                    const t = m.open + m.completed;
                                    return (
                                      <div key={m.staffId} className="px-3 py-2 space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold truncate">{m.name}</span>
                                          <span className="ml-auto text-muted-foreground whitespace-nowrap">{m.completed} done · {m.open} pending</span>
                                        </div>
                                        <ProgressBar size="sm" value={t ? (m.completed / t) * 100 : 0} />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Work Overview — the first tab of Reports > Master Dashboard
// ════════════════════════════════════════════════════════════════════════════

/**
 * Lives in the Reports page (Master Dashboard). The page's own Period filter and
 * Export button drive it: period / from / to come in as props and its export is
 * handed back through registerExport.
 */
export function WorkOverview({ period, from = "", to = "", registerExport }: { period: string; from?: string; to?: string; registerExport?: (fn: (k: ExportKind) => void) => void }) {
  const [custSearch, setCustSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [staffShow, setStaffShow] = useState<"all" | "pending" | "overdue">("all");
  const companyName = useCompanyName();
  const base = useBase();

  // The Reports page's "All Time" is sent as all_time (same name here).
  const waiting = needsDate(period, from, to);
  const q = useQuery({
    queryKey: ["workOverview", period, from, to],
    queryFn: () => utilityService.getWorkOverview(period, from, to),
    enabled: !waiting,
    retry: (n: number, e: any) => !isForbidden(e) && n < 1,
  });
  const data: any = q.data || {};
  const s = data.summary || {};
  const ct = custSearch.trim().toLowerCase();
  const stt = staffSearch.trim().toLowerCase();
  const customers: any[] = toList(data.customers).filter((c: any) => !ct || c.name.toLowerCase().includes(ct));
  const staff: any[] = toList(data.staff)
    .filter((r: any) => staffShow === "all" || (staffShow === "pending" ? r.open > 0 : r.overdue > 0))
    .filter((r: any) => !stt || `${r.name} ${r.email}`.toLowerCase().includes(stt));
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const onExport = (kind: ExportKind) => {
    runExport(kind, {
      title: "Work Overview",
      subtitle: `Period: ${periodLabel(period, from, to)}`,
      companyName,
      kpis: [
        { label: "Customers", value: String(s.customers || 0) },
        { label: "Active Projects", value: `${s.activeProjects || 0} / ${s.projects || 0}` },
        { label: "Staff", value: String(s.staff || 0) },
        { label: "Pending Tasks", value: String(s.tasksOpen || 0) },
        { label: "Overdue", value: String(s.tasksOverdue || 0) },
        { label: "Done in Period", value: String(s.completedInPeriod || 0) },
      ],
      sections: [
        {
          title: "Staff — work done vs pending",
          headers: ["Staff", "Progress", "Done / Total", "Pending", "Overdue", "Due Today", "Done in Period", "Hours (h:m)", "Active Projects", "Customers", "Last Active"],
          rows: staff.map((r) => [r.name, `${r.progress}%`, `${r.completed} / ${r.total}`, r.open, r.overdue, r.dueToday, r.completedInPeriod, hm(r.hours), r.activeProjects, r.activeCustomers, dateTime(r.lastActivity)]),
        },
        ...(data.access?.customers ? [{
          title: "Customers — work done vs pending",
          headers: ["Customer", "Progress", "Done / Total", "Pending", "Overdue", "Projects (active)", "Staff"],
          rows: customers.map((c) => [c.name, `${c.progress}%`, `${c.completed} / ${c.totalTasks}`, c.open, c.overdue, `${c.projects} (${c.activeProjects})`, c.staff.length]),
        }] : []),
      ],
      fileName: "work_overview",
    });
  };
  // The page's Export button calls the latest version of this.
  useEffect(() => { registerExport?.(onExport); });

  return (
    <div className="space-y-5">
      <WorkReportLinks current="overview" />

      <LoadError error={q.error} what="the work overview" />
      {waiting && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{period === "date" ? "Choose the date." : "Choose a From or To date for the custom period."}</div>}
      {data.access && !data.access.allStaff && <OwnRecordsNote what="Staff (only your own work)" />}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Kpi label="Customers" value={q.isLoading ? "…" : s.customers || 0} hint={`${s.customersWithPending || 0} with pending work`} />
        <Kpi label="Projects" value={q.isLoading ? "…" : `${s.activeProjects || 0} / ${s.projects || 0}`} hint="active / total" />
        <Kpi label="Staff" value={q.isLoading ? "…" : s.staff || 0} hint={`${s.staffWithOverdue || 0} with overdue tasks`} />
        <Kpi label="Pending Tasks" value={q.isLoading ? "…" : s.tasksOpen || 0} />
        <Kpi label="Overdue" value={q.isLoading ? "…" : s.tasksOverdue || 0} tone={s.tasksOverdue ? "text-red-600" : "text-foreground"} />
        <Kpi label="Due Today" value={q.isLoading ? "…" : s.tasksDueToday || 0} tone={s.tasksDueToday ? "text-amber-600" : "text-foreground"} />
        <Kpi label="Done in Period" value={q.isLoading ? "…" : s.completedInPeriod || 0} tone="text-emerald-600" />
        <Kpi label="Hours Logged" value={q.isLoading ? "…" : hm(s.hours || 0)} hint="in period" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {s.customerProgress != null && data.access?.customers && (
          <Card className="rounded-2xl"><CardContent className="p-4"><ProgressBar size="lg" value={s.customerProgress} label="Customer work complete (project + customer tasks)" sub={`${s.customerProgress}%`} /></CardContent></Card>
        )}
        <Card className="rounded-2xl"><CardContent className="p-4"><ProgressBar size="lg" value={s.staffProgress || 0} label="Staff tasks complete (every task assigned to staff)" sub={`${s.staffProgress || 0}%`} /></CardContent></Card>
      </div>

      {q.isLoading ? <Loading /> : (
        <div className={`grid grid-cols-1 ${data.access?.customers ? "2xl:grid-cols-5" : ""} gap-4`}>
          <Card className={`rounded-2xl overflow-hidden ${data.access?.customers ? "2xl:col-span-3" : ""}`}>
            <CardHeader className="border-b py-3 px-5 flex flex-row flex-wrap items-center gap-2 space-y-0">
              <CardTitle className="text-sm font-bold mr-auto">Staff — work done vs pending ({staff.length})</CardTitle>
              <Select value={staffShow} onValueChange={(v) => setStaffShow(v as any)}>
                <SelectTrigger className="w-[140px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All staff</SelectItem>
                  <SelectItem value="pending" className="text-xs">With pending</SelectItem>
                  <SelectItem value="overdue" className="text-xs">With overdue</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" /><Input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Search staff" className="h-8 w-[150px] pl-8 text-xs rounded-lg" /></div>
            </CardHeader>
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Staff", "Progress", "Pending", "Overdue", "Due Today", "Done in Period", "Hours", "Projects", "Last Active", ""].map((h, i) => <TableHead key={i} className="text-xs whitespace-nowrap">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.length === 0 ? <TableEmpty colSpan={10}>No staff for the selected filters.</TableEmpty> : staff.map((r) => (
                    <TableRow key={r.staffId}>
                      <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                      <TableCell className="min-w-[150px]"><ProgressBar size="sm" value={r.progress} /><span className="text-[10px] text-muted-foreground">{r.completed} / {r.total} done · {r.progress}%</span></TableCell>
                      <TableCell className="font-bold">{r.open}</TableCell>
                      <TableCell className={r.overdue ? "text-red-600 font-bold" : "text-muted-foreground"}>{r.overdue}</TableCell>
                      <TableCell className={r.dueToday ? "text-amber-600 font-bold" : "text-muted-foreground"}>{r.dueToday}</TableCell>
                      <TableCell>{r.completedInPeriod}</TableCell>
                      <TableCell>{hm(r.hours)}</TableCell>
                      <TableCell>{r.activeProjects}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">{r.lastActivity ? dateTime(r.lastActivity) : "-"}</TableCell>
                      <TableCell><Button asChild variant="ghost" size="sm" className="h-7 text-xs"><Link to={`${base}/reports/staff-work?date=${todayStr}&staff=${r.staffId}`}>Report</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {data.access?.customers && (
            <Card className="rounded-2xl overflow-hidden 2xl:col-span-2">
              <CardHeader className="border-b py-3 px-5 flex flex-row flex-wrap items-center gap-2 space-y-0">
                <CardTitle className="text-sm font-bold mr-auto">Customers — work done vs pending ({customers.length})</CardTitle>
                <div className="relative"><Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-muted-foreground" /><Input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search customer" className="h-8 w-[150px] pl-8 text-xs rounded-lg" /></div>
              </CardHeader>
              <div className="max-h-[560px] overflow-y-auto divide-y">
                {customers.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No customers with projects or tasks.</p> : customers.map((c) => (
                  <div key={c._id} className="px-5 py-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Link to={`${base}/customers/${c._id}`} className="font-bold hover:underline truncate">{c.name}</Link>
                      <span className="text-muted-foreground whitespace-nowrap">{c.projects} proj · {c.staff.length} staff</span>
                      <span className="ml-auto whitespace-nowrap"><b>{c.open}</b> pending{c.overdue ? <span className="text-red-600 font-bold"> · {c.overdue} overdue</span> : null}</span>
                    </div>
                    <ProgressBar size="sm" value={c.progress} />
                    <p className="text-[10px] text-muted-foreground">{c.completed} of {c.totalTasks} tasks complete · {c.progress}%</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

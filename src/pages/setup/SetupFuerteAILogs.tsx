import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AudioLines, RefreshCw, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assistantService } from "@/api/services/assistant.service";

// Event → label, colour and what it tells an admin. Order = summary card order.
const EVENTS: Record<string, { label: string; badge: string; hint: string }> = {
  wake: { label: "Wake word", badge: "bg-sky-100 text-sky-700", hint: '"Hey CRM" was heard' },
  command: { label: "Page opened", badge: "bg-green-100 text-green-700", hint: "Voice command worked" },
  ai_reply: { label: "AI answered", badge: "bg-emerald-100 text-emerald-700", hint: "AI replied successfully" },
  ai_error: { label: "AI failed", badge: "bg-red-100 text-red-700", hint: "AI request failed — see Problem" },
  speech_error: { label: "Voice error", badge: "bg-orange-100 text-orange-700", hint: "Browser/mic problem — see Problem" },
  timeout: { label: "Nothing heard", badge: "bg-amber-100 text-amber-700", hint: "Woke up but no command followed" },
  no_access: { label: "No access", badge: "bg-purple-100 text-purple-700", hint: "User lacks permission for that page" },
  mic_on: { label: "Mic on", badge: "bg-gray-100 text-gray-700", hint: "Button clicked to wake" },
  mic_off: { label: "Mic off", badge: "bg-gray-100 text-gray-600", hint: "Button clicked to stop" },
};

// Plain-language explanations for the most common problems.
const PROBLEM_HELP: Record<string, string> = {
  "not-allowed": "Mic blocked for the site — allow Microphone in the browser's site settings.",
  "service-not-allowed": "Browser doesn't allow speech recognition — use Chrome or Edge on a computer.",
  "audio-capture": "No working microphone on that device.",
  network: "Browser can't reach its speech service (Brave, VPN, office firewall).",
  "microphone-unavailable": "Mic permission denied or no mic.",
};

const RANGES: Record<string, { label: string; days: number | null }> = {
  today: { label: "Today", days: 0 },
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
};

const rangeStart = (key: string): string | undefined => {
  const r = RANGES[key];
  if (!r || r.days === null) return undefined;
  const d = new Date();
  if (r.days === 0) d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - r.days);
  return d.toISOString();
};

const SetupFuerteAILogs = () => {
  const [event, setEvent] = useState("all");
  const [userId, setUserId] = useState("all");
  const [range, setRange] = useState("7d");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["fuerte-ai-logs", event, userId, range, query, page],
    queryFn: () =>
      assistantService.getVoiceLogs({
        event: event === "all" ? undefined : event,
        user_id: userId === "all" ? undefined : userId,
        from: rangeStart(range),
        q: query || undefined,
        page,
        limit: 50,
      }),
  });

  const logs: any[] = data?.logs || [];
  const counts: Record<string, number> = data?.counts || {};
  const users: { _id: string; name: string }[] = data?.users || [];
  const totalEvents = Object.values(counts).reduce((a, b) => a + b, 0);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
              <AudioLines className="h-6 w-6 text-primary" /> FuerteAI Logs
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything the "Hey CRM" assistant heard and did — use it to check voice is working for your team and to
              find phrases or errors to fix. Kept for 90 days.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Summary cards — click to filter */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {["wake", "command", "ai_reply", "ai_error", "speech_error", "timeout", "no_access"].map((key) => {
            const meta = EVENTS[key];
            const active = event === key;
            return (
              <button
                key={key}
                onClick={() => resetPage(setEvent)(active ? "all" : key)}
                title={meta.hint}
                className={`rounded-xl border p-3 text-left transition-colors hover:border-primary/50 ${
                  active ? "border-primary bg-primary/5" : "bg-card"
                }`}
              >
                <p className="text-xs text-muted-foreground">{meta.label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{counts[key] || 0}</p>
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="space-y-4 p-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={range} onValueChange={resetPage(setRange)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RANGES).map(([k, r]) => (
                    <SelectItem key={k} value={k}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={event} onValueChange={resetPage(setEvent)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="All events" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {Object.entries(EVENTS).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={userId} onValueChange={resetPage(setUserId)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All users" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>{u.name || "Unknown"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <form
                className="flex min-w-[220px] flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setQuery(search.trim());
                  setPage(1);
                }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search what was said, errors, users… (Enter)"
                    className="pl-8"
                  />
                </div>
              </form>
              <span className="text-xs text-muted-foreground">{totalEvents} events in range</span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="min-w-[200px]">Heard / Asked</TableHead>
                    <TableHead className="min-w-[200px]">Result</TableHead>
                    <TableHead className="min-w-[200px]">Problem</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Browser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-red-600">
                        {(error as any)?.response?.data?.message || "Could not load logs."}
                      </TableCell>
                    </TableRow>
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No FuerteAI activity in this range yet. Say "Hey CRM" or ask the assistant something, then refresh.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const meta = EVENTS[log.event] || { label: log.event, badge: "bg-gray-100 text-gray-700" };
                      const help = PROBLEM_HELP[log.detail];
                      return (
                        <TableRow key={log._id} className="align-top">
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), "dd MMM, HH:mm:ss")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{log.user_name || "—"}</TableCell>
                          <TableCell>
                            <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                              {meta.label}
                            </span>
                            {log.source && (
                              <span className="ml-1 text-[10px] uppercase text-muted-foreground">{log.source}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{log.heard ? `"${log.heard}"` : "—"}</TableCell>
                          <TableCell className="text-sm">
                            <span className="line-clamp-3">{log.result || "—"}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.detail ? (
                              <>
                                <span className="font-medium text-red-600">{log.detail}</span>
                                {help && <p className="mt-0.5 text-xs text-muted-foreground">{help}</p>}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{log.page || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{log.browser || "—"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{data?.total ?? 0} rows</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>
                  Page {data?.page ?? page} of {data?.pages ?? 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (data?.pages ?? 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SetupFuerteAILogs;

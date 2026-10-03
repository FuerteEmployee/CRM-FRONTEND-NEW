import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Phone,
  PhoneOff,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Play,
} from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { callingAgentService } from "@/api/services/callingAgent.service";
import { customerService } from "@/api/services/customer.service";
import { staffService } from "@/api/services/staff.service";
import { useToast } from "@/hooks/use-toast";
import { useNotificationContext } from "@/context/NotificationContext";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDateTime } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type {
  Call,
  CallFilters,
  CallStatus,
  ProcessingStatus,
} from "@/types/callingAgent";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/table";

const STATUS_OPTIONS: { value: CallStatus; label: string }[] = [
  { value: "ringing", label: "Ringing" },
  { value: "answered", label: "Answered" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "rejected_unknown_number", label: "Rejected (Unknown Number)" },
  { value: "failed", label: "Failed" },
];

const MATCH_STATUS_OPTIONS = [
  { value: "matched", label: "Matched" },
  { value: "not_found", label: "Not Found" },
  { value: "ambiguous", label: "Ambiguous" },
];

const LANGUAGE_OPTIONS = [
  { value: "gu-IN", label: "Gujarati" },
  { value: "hi-IN", label: "Hindi" },
  { value: "en-IN", label: "English" },
];
const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGE_OPTIONS.map((o) => [o.value, o.label])
);

const STATUS_STYLES: Record<CallStatus, string> = {
  ringing: "bg-blue-50 text-blue-600 border-blue-200",
  answered: "bg-blue-50 text-blue-600 border-blue-200",
  completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  missed: "bg-amber-50 text-amber-600 border-amber-200",
  rejected_unknown_number: "bg-red-50 text-red-600 border-red-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

const PROCESSING_STYLES: Record<ProcessingStatus, string> = {
  pending: "bg-slate-50 text-slate-500 border-slate-200",
  processing: "bg-blue-50 text-blue-600 border-blue-200",
  done: "bg-emerald-50 text-emerald-600 border-emerald-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

function formatDuration(seconds?: number) {
  if (seconds === undefined || seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function refToId(ref: any): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}

const EMPTY_FILTERS: CallFilters = {};

const CallingAgent = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isStaff } = usePermissions();
  const { socket } = useNotificationContext();
  const basePath = isStaff ? "/staff" : "/admin";

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CallFilters>(EMPTY_FILTERS);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const { data: calls = [], isLoading } = useQuery<Call[]>({
    queryKey: ["calling-agent-calls", filters, search],
    queryFn: () => callingAgentService.getCalls({ ...filters, search: search || undefined }),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["calling-agent-call-detail", selectedCallId],
    queryFn: () => callingAgentService.getCallDetail(selectedCallId as string),
    enabled: !!selectedCallId,
  });

  // Live updates — reuses the one app-wide socket NotificationContext
  // already owns instead of opening a second connection. A call arrives in
  // 'ringing' state and this same event updates it in place all the way
  // through completed -> transcribed, per the spec.
  useEffect(() => {
    if (!socket) return;
    const handler = (updatedCall: Call) => {
      queryClient.setQueryData<Call[]>(["calling-agent-calls", filters, search], (prev) => {
        if (!prev) return prev;
        const exists = prev.some((c) => c._id === updatedCall._id);
        return exists
          ? prev.map((c) => (c._id === updatedCall._id ? { ...c, ...updatedCall } : c))
          : [updatedCall, ...prev];
      });
      if (selectedCallId === updatedCall._id) {
        queryClient.invalidateQueries({ queryKey: ["calling-agent-call-detail", selectedCallId] });
      }
    };
    socket.on("calling-agent:call-update", handler);
    return () => {
      socket.off("calling-agent:call-update", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, filters, search, selectedCallId]);

  const resolveCustomerMutation = useMutation({
    mutationFn: ({ callId, customerId }: { callId: string; customerId: string }) =>
      callingAgentService.resolveCustomer(callId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-agent-calls"] });
      toast({ title: "Customer resolved" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to resolve customer", description: err?.message });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (callId: string) => callingAgentService.retryTranscription(callId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calling-agent-calls"] });
      queryClient.invalidateQueries({ queryKey: ["calling-agent-call-detail"] });
      toast({ title: "Retrying transcription" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Retry failed", description: err?.message });
    },
  });

  const customerOptions = useMemo(
    () => customers.map((c: any) => ({ label: c.company, value: c._id })),
    [customers]
  );
  const staffOptions = useMemo(
    () => staff.map((s: any) => ({ label: `${s.firstname} ${s.lastname}`, value: s._id })),
    [staff]
  );

  const selectedCall = detail?.call as Call | undefined;
  const selectedTranscript = detail?.transcript;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Calling Agent</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
              Call Log &amp; Transcripts
            </p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/30">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Filter calls"
                      className="h-11 w-11 shrink-0 bg-white border-slate-200 rounded-2xl relative"
                    >
                      <Filter className={cn("h-4 w-4", activeFilterCount > 0 ? "text-primary" : "text-slate-400")} />
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[9px] text-white flex items-center justify-center font-black">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Filters</p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setFilters(EMPTY_FILTERS)}
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={filters.dateFrom || ""}
                        onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
                      />
                      <Input
                        type="date"
                        className="h-9 text-xs"
                        value={filters.dateTo || ""}
                        onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
                      />
                    </div>

                    <Select
                      value={filters.status || "all"}
                      onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : (v as CallStatus) }))}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filters.matchStatus || "all"}
                      onValueChange={(v) => setFilters((f) => ({ ...f, matchStatus: v === "all" ? undefined : (v as any) }))}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Match Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Match Statuses</SelectItem>
                        {MATCH_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <SearchableSelect
                      options={customerOptions}
                      value={filters.customerId}
                      onValueChange={(v) => setFilters((f) => ({ ...f, customerId: v || undefined }))}
                      placeholder="Filter by customer..."
                    />

                    <SearchableSelect
                      options={staffOptions}
                      value={filters.staffId}
                      onValueChange={(v) => setFilters((f) => ({ ...f, staffId: v || undefined }))}
                      placeholder="Filter by staff..."
                    />

                    <Select
                      value={filters.language || "all"}
                      onValueChange={(v) => setFilters((f) => ({ ...f, language: v === "all" ? undefined : v }))}
                    >
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Language" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        {LANGUAGE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[3]" />
                <Input
                  placeholder="Search transcripts..."
                  className="pl-12 h-11 bg-white border-slate-200 rounded-2xl text-xs font-bold transition-all focus:ring-4 focus:ring-primary/5"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Table className="min-w-[1200px]" wrapperClassName="max-h-[650px] no-scrollbar">
                <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-muted/50">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transcript</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Handled By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : calls.length === 0 ? (
                    <TableEmpty colSpan={8}>No calls yet. They'll show up here the moment one comes in.</TableEmpty>
                  ) : (
                    calls.map((call) => (
                      <TableRow
                        key={call._id}
                        onClick={() => setSelectedCallId(call._id)}
                        className={cn(
                          "cursor-pointer",
                          call.matchStatus === "not_found" && "bg-red-50/40 hover:bg-red-50/70"
                        )}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(call.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {call.status === "rejected_unknown_number" || call.status === "failed" ? (
                              <PhoneOff className="h-3.5 w-3.5 text-red-500" />
                            ) : (
                              <Phone className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                            {call.fromNumberE164 || call.fromNumber}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {call.matchStatus === "matched" && call.customerId ? (
                            <Link
                              to={`${basePath}/customers/${refToId(call.customerId)}`}
                              className="font-bold text-primary hover:underline"
                            >
                              {typeof call.customerId === "object" ? call.customerId.company : "View Customer"}
                            </Link>
                          ) : call.matchStatus === "ambiguous" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer border-amber-200 text-amber-600 bg-amber-50 font-bold"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" /> Multiple Matches
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {(call.candidateCustomerIds || []).map((cand: any) => (
                                  <DropdownMenuItem
                                    key={refToId(cand)}
                                    onSelect={() =>
                                      resolveCustomerMutation.mutate({ callId: call._id, customerId: refToId(cand) })
                                    }
                                  >
                                    {typeof cand === "object" ? cand.company : refToId(cand)}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 font-bold">
                                Not in customers
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-[10px] font-black uppercase text-primary"
                                asChild
                              >
                                <Link
                                  to={`${basePath}/customers?prefillPhone=${(call.fromNumberE164 || call.fromNumber || "").replace(/\D/g, "").slice(-10)}`}
                                >
                                  <UserPlus className="h-3 w-3" /> Create
                                </Link>
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDuration(call.durationSeconds)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("font-bold capitalize", STATUS_STYLES[call.status])}>
                            {call.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={cn("font-bold capitalize", PROCESSING_STYLES[call.transcriptionStatus])}>
                              {call.transcriptionStatus}
                            </Badge>
                            {call.transcriptionStatus === "failed" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                title="Retry transcription"
                                onClick={() => retryMutation.mutate(call._id)}
                                disabled={retryMutation.isPending}
                              >
                                <RefreshCw className={cn("h-3 w-3", retryMutation.isPending && "animate-spin")} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(call.languagesDetected || []).map((code) => (
                              <Badge key={code} variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-500">
                                {LANGUAGE_LABELS[code] || code}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {call.handledByStaffId && typeof call.handledByStaffId === "object"
                            ? `${call.handledByStaffId.firstname || ""} ${call.handledByStaffId.lastname || ""}`.trim()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedCallId} onOpenChange={(open) => !open && setSelectedCallId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto no-scrollbar">
          <SheetHeader>
            <SheetTitle>Call Details</SheetTitle>
            <SheetDescription>
              {selectedCall ? formatDateTime(selectedCall.createdAt) : ""}
            </SheetDescription>
          </SheetHeader>

          {isDetailLoading ? (
            <div className="space-y-3 mt-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedCall ? (
            <div className="space-y-6 mt-6">
              {selectedCall.recordingUrl && (
                <audio
                  controls
                  className="w-full"
                  src={`${import.meta.env.VITE_API_URL}/calling-agent/calls/${selectedCall._id}/recording`}
                >
                  Your browser doesn't support audio playback.
                </audio>
              )}

              {selectedCall.transcriptionStatus === "failed" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-700 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    Transcription failed{selectedCall.transcriptionError ? `: ${selectedCall.transcriptionError}` : ""}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-red-200 text-red-600"
                    onClick={() => retryMutation.mutate(selectedCall._id)}
                    disabled={retryMutation.isPending}
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", retryMutation.isPending && "animate-spin")} />
                    Retry
                  </Button>
                </div>
              )}

              {selectedTranscript?.summary?.text && (
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Summary</p>
                  <p className="text-sm text-slate-700">{selectedTranscript.summary.text}</p>
                  {selectedTranscript.summary.keyPoints?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Key Points</p>
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {selectedTranscript.summary.keyPoints.map((kp: string, i: number) => (
                          <li key={i}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedTranscript.summary.actionItems?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Action Items</p>
                      <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                        {selectedTranscript.summary.actionItems.map((ai: string, i: number) => (
                          <li key={i}>{ai}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedTranscript.summary.sentiment && (
                    <Badge variant="outline" className="font-bold capitalize">
                      {selectedTranscript.summary.sentiment}
                    </Badge>
                  )}
                </div>
              )}

              {selectedTranscript?.utterances?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Transcript</p>
                  <div className="space-y-2">
                    {selectedTranscript.utterances.map((u: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-xs",
                          u.speaker === "customer"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-primary/10 text-slate-800 ml-auto"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <span>{u.speaker}</span>
                          <span>{Math.floor(u.startMs / 1000)}s</span>
                          {u.detectedLanguage && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold">
                              {LANGUAGE_LABELS[u.detectedLanguage] || u.detectedLanguage}
                            </Badge>
                          )}
                          {u.speakerSource === "diarization" && (
                            <span title="Speaker identified automatically — may be inaccurate">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            </span>
                          )}
                          {u.languageConfidence !== null && u.languageConfidence !== undefined && u.languageConfidence < 0.6 && (
                            <span className="text-amber-600">low confidence</span>
                          )}
                        </div>
                        <p>{u.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedTranscript && selectedCall.transcriptionStatus !== "failed" && (
                <p className="text-sm text-slate-400 text-center py-8">
                  {selectedCall.transcriptionStatus === "pending" || selectedCall.transcriptionStatus === "processing"
                    ? "Transcript is still processing — this updates automatically."
                    : "No transcript available for this call."}
                </p>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default CallingAgent;

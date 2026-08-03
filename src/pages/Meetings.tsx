import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, Clock, Users, Trash2, Edit, Video, Copy, Sparkles, Mic, StopCircle } from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingService } from "@/api/services/meeting.service";
import { staffService } from "@/api/services/staff.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dateFormat";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
import { Checkbox } from "@/components/ui/checkbox";

const memberLabel = (m: any) =>
  typeof m === "string" ? m : [m?.firstname, m?.lastname].filter(Boolean).join(" ") || m?.email || m?._id;

export default function Meetings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  useOpenCreateModal(() => setIsModalOpen(true));
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [scribeMeeting, setScribeMeeting] = useState<any>(null);
  const [scribeText, setScribeText] = useState("");
  const [isScribing, setIsScribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  // FuerteAI Scribe defaults to Hindi — most meetings this is built for run in Hindi/Hinglish.
  const [scribeLanguage, setScribeLanguage] = useState("hi-IN");
  const [isScribeThinking, setIsScribeThinking] = useState(false);
  // Manual diagnostic test box — lets you type a single line and see FuerteAI's
  // full reasoning (verdict + reason), instead of needing a live meeting and
  // guessing why it stayed silent.
  const [diagnosticInput, setDiagnosticInput] = useState("");
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  // finalTranscript only — NOT the combined transcript (which also includes
  // unfinalized interim results). Triggering off interim text would mean
  // reacting to half-spoken sentences, which the backend RULE 2/4 both assume
  // never happens (it expects to see completed sentences only).
  const { finalTranscript, listening: speechListening, resetTranscript: resetSpeechTranscript } = useSpeechRecognition();

  const SCRIBE_LANGUAGES = [
    { value: "hi-IN", label: "Hindi" },
    { value: "en-US", label: "English" },
  ];

  // No wake word — FuerteAI decides per RULE 1/4 in the backend prompt whether
  // a transcript chunk is a CRM question worth answering. Client-side we only
  // gate on (a) a lightweight local "does this look like a question" check so
  // we don't spam the API on pure statements, and (b) a short cooldown so we
  // don't fire on every recognizer tick.
  const lastScribeCallRef = useRef(0);
  const scribeProcessingRef = useRef(false);
  const scribeProcessedLenRef = useRef(0);
  const SCRIBE_MIN_GAP_MS = 3000;
  // answer_key -> { reply, at } — the same "already answered" ledger the
  // backend keys ALREADY_ANSWERED off of, mirrored here so the client can
  // also refuse to re-display a duplicate even if the model slips (RULE 1's
  // "ek sawaal, ek jawab" is enforced on both sides, not just trusted blindly).
  const scribeAnsweredRef = useRef<Map<string, { reply: string; at: number }>>(new Map());

  const QUESTION_WORDS = ["kya", "kaun", "kab", "kahan", "kaise", "kitna", "kitne", "konsa", "kaunsa", "status", "pending", "bakaya", "hua", "aaya", "bheja", "nahi"];
  const REPEAT_PHRASES = ["phir se batao", "repeat karo", "kitna bola tha", "फिर से बताओ", "दोबारा बताओ"];
  const isQuestionLike = (text: string) => {
    const lower = text.toLowerCase();
    if (/[?？]/.test(text)) return true;
    if (REPEAT_PHRASES.some((p) => lower.includes(p))) return true;
    return QUESTION_WORDS.some((w) => lower.includes(w));
  };

  const speakScribeReply = (text: string) => {
    if (!text || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN"; // this Scribe persona replies in Hindi only, always (RULE 5)
    const voices = window.speechSynthesis.getVoices();
    const exact = voices.find((v) => v.lang === utterance.lang);
    const partial = voices.find((v) => v.lang?.startsWith("hi"));
    if (exact || partial) utterance.voice = (exact || partial) as SpeechSynthesisVoice;
    window.speechSynthesis.speak(utterance);
  };

  // FuerteAI is always on — no wake word needed. Every fresh, finalized chunk
  // of speech that looks like a question is sent to the backend, which picks
  // the right module first (RULE 1) then decides "a": ans/clarify/none/silent/
  // blocked/no_module itself, after running the RULE 5 data checks.
  const maybeTriggerScribeTurn = async (fullText: string, meeting: any) => {
    if (!meeting || scribeProcessingRef.current) return;
    if (fullText.length <= scribeProcessedLenRef.current) return; // nothing new since last check
    const now = Date.now();
    if (now - lastScribeCallRef.current < SCRIBE_MIN_GAP_MS) return;

    const newChunk = fullText.slice(scribeProcessedLenRef.current);
    if (!isQuestionLike(newChunk)) {
      scribeProcessedLenRef.current = fullText.length; // seen, not a question — don't re-check it
      return;
    }

    lastScribeCallRef.current = now;
    scribeProcessedLenRef.current = fullText.length;
    scribeProcessingRef.current = true;
    setIsScribeThinking(true);
    try {
      const recentTranscript = fullText.split("\n").slice(-15).join("\n");
      const hasExternalParticipant = !!meeting.meeting_type && meeting.meeting_type !== "Internal";
      const turn = await meetingService.scribeTurn(
        meeting._id,
        recentTranscript,
        hasExternalParticipant,
        Array.from(scribeAnsweredRef.current.keys())
      );
      // "a" is one of: ans | clarify | none | silent | blocked | no_module.
      // Only "silent" means nothing to show — everything else carries a reply.
      if (!turn?.a || turn.a === "silent") return;

      // Client-side dedup guard: even if the model slips and answers a key we
      // already have, don't re-display it — unless it's an explicit repeat request.
      if (turn.k && scribeAnsweredRef.current.has(turn.k) && !turn.is_repeat) return;

      setScribeText((prev) => {
        // question_en/asked_by aren't in this schema — fall back to the raw
        // speech chunk that triggered this turn as the "question heard" line.
        const qLine = newChunk.trim() ? `\n❓ ${newChunk.trim()}` : "";
        const aLine = turn.r ? `\n✅ FuerteAI: ${turn.r}` : "";
        const updated = `${prev}${qLine}${aLine}`;
        scribeProcessedLenRef.current = updated.length; // don't answer our own Q&A entry
        return updated;
      });
      if (turn.k) scribeAnsweredRef.current.set(turn.k, { reply: turn.r, at: Date.now() });
      if (turn.r) speakScribeReply(turn.r);
    } catch (err) {
      // A failed live-answer attempt should never interrupt the meeting itself.
      console.error("FuerteAI Scribe live turn failed:", err);
    } finally {
      scribeProcessingRef.current = false;
      setIsScribeThinking(false);
    }
  };


  const [formData, setFormData] = useState({
    topic: "",
    agenda: "",
    date: "",
    time: "",
    status: "Scheduled",
    members: [] as string[],
    summary: "",
    meeting_link: "",
    reminder_time: "15",
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const res = await meetingService.getMeetings();
      return res || [];
    },
  });

  // Members are picked from actual Staff accounts, fetched dynamically —
  // each entry shows whether it's a regular Staff member or an Admin.
  const { data: staffList = [] } = useQuery({
    queryKey: ["staff-for-meetings"],
    queryFn: async () => {
      const res = await staffService.getAll();
      return res || [];
    },
    retry: false,
  });

  const toggleMember = (staffId: string) => {
    setFormData((prev) => ({
      ...prev,
      members: prev.members.includes(staffId)
        ? prev.members.filter((id) => id !== staffId)
        : [...prev.members, staffId],
    }));
  };

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m: any) =>
      m.topic?.toLowerCase().includes(search.toLowerCase()) ||
      m.agenda?.toLowerCase().includes(search.toLowerCase())
    );
  }, [meetings, search]);

  const createMutation = useMutation({
    mutationFn: (data: any) => meetingService.createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Success", description: "Meeting created successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => meetingService.updateMeeting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Success", description: "Meeting updated successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => meetingService.deleteMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ title: "Success", description: "Meeting deleted successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: any[]) => meetingService.importMeetings(rows),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      const count = data?.count ?? 0;
      const skipped = data?.skipped ?? 0;
      toast({
        title: count === 0 ? "No Meetings Imported" : "Import Successful",
        description: count === 0 ? "No rows had the required Topic, Agenda, and Date columns." : `Imported ${count} meeting(s)${skipped ? `, skipped ${skipped} invalid row(s)` : ""}.`,
        variant: count === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const handleImportData = (rows: Record<string, any>[]) => {
    importMutation.mutate(rows as any);
  };

  const handleInputChange = (e: any) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMeeting(null);
    setFormData({
      topic: "",
      agenda: "",
      date: "",
      time: "",
      status: "Scheduled",
      members: [],
      summary: "",
      meeting_link: "",
      reminder_time: "15",
    });
  };

  const handleEdit = (meeting: any) => {
    setEditingMeeting(meeting);
    setFormData({
      topic: meeting.topic || "",
      agenda: meeting.agenda || "",
      date: meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : "",
      time: meeting.time || "",
      status: meeting.status || "Scheduled",
      members: Array.isArray(meeting.members)
        ? meeting.members.map((m: any) => (typeof m === "string" ? m : m._id)).filter(Boolean)
        : [],
      summary: meeting.summary || "",
      meeting_link: meeting.meeting_link || "",
      reminder_time: meeting.reminder_time?.toString() || "15",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this meeting?")) {
      deleteMutation.mutate(id);
    }
  };

  const openGoogleMeet = (link: string) => {
    if (!link) return;
    const width = 1100;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    // Opens Google Meet in a dedicated, app-like popup window
    window.open(
      link,
      "GoogleMeetApp",
      `width=${width},height=${height},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
    );
  };

  const handleSave = () => {
    if (!formData.topic || !formData.date) {
      toast({ title: "Validation Error", description: "Topic and Date are required", variant: "destructive" });
      return;
    }
    
    if (!formData.meeting_link) {
      toast({ title: "Validation Error", description: "Please provide a Google Meet link", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      reminder_time: parseInt(formData.reminder_time, 10) || 15,
    };

    if (editingMeeting) {
      updateMutation.mutate({ id: editingMeeting._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  useEffect(() => {
    if (speechListening && finalTranscript) {
      setScribeText((prev) => {
        const base = prev ? prev + "\n" : "";
        return base + finalTranscript;
      });
      resetSpeechTranscript();
    }
  }, [finalTranscript, speechListening]);

  // Fires on every scribeText change (new speech appended) while actively
  // listening — maybeTriggerScribeTurn itself decides whether that actually
  // warrants calling the AI (new content + rate limit; the model itself
  // decides answer vs. stay_silent, there's no wake word gate anymore).
  useEffect(() => {
    if (isScribing && scribeMeeting) {
      maybeTriggerScribeTurn(scribeText, scribeMeeting);
    }
  }, [scribeText]);

  const handleStartScribe = (meeting: any) => {
    setScribeMeeting(meeting);
    setScribeText(meeting.summary || "");
    setIsScribing(false);
    lastScribeCallRef.current = 0;
    scribeProcessedLenRef.current = 0;
    scribeAnsweredRef.current = new Map();
  };

  // FuerteAI Scribe starts automatically the moment the user joins the meeting —
  // nobody has to remember to click "AI Scribe" separately.
  const handleJoinAndScribe = (meeting: any) => {
    openGoogleMeet(meeting.meeting_link || "https://meet.google.com/new");
    setScribeMeeting(meeting);
    setScribeText(meeting.summary || "");
    lastScribeCallRef.current = 0;
    scribeProcessedLenRef.current = 0;
    scribeAnsweredRef.current = new Map();
    resetSpeechTranscript();
    SpeechRecognition.startListening({ continuous: true, language: scribeLanguage });
    setIsScribing(true);
    toast({ title: "FuerteAI Scribe Active", description: "Listening continuously — it answers any CRM question immediately, in Hindi, no wake word needed." });
  };

  // Manually test a single line without a live meeting — always returns a
  // verdict + reason (no "stay_silent" in diagnostic mode), so you can see
  // exactly why FuerteAI would or wouldn't answer a given sentence.
  const handleRunDiagnostic = async () => {
    if (!scribeMeeting || !diagnosticInput.trim()) return;
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    try {
      const result = await meetingService.scribeDiagnostic(
        scribeMeeting._id,
        diagnosticInput,
        Array.from(scribeAnsweredRef.current.keys())
      );
      setDiagnosticResult(result);
    } catch (err: any) {
      toast({ title: "Diagnostic failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsDiagnosing(false);
    }
  };

  const toggleScribeRecording = () => {
    if (isScribing) {
      SpeechRecognition.stopListening();
      setIsScribing(false);
      toast({ title: "AI Scribe Paused", description: "Stopped recording meeting speech." });
    } else {
      resetSpeechTranscript();
      SpeechRecognition.startListening({ continuous: true, language: scribeLanguage });
      setIsScribing(true);
      toast({ title: "AI Scribe Recording", description: "Listening to Google Meet discussion..." });
    }
  };

  const handleSummarizeScribe = async () => {
    if (!scribeMeeting) return;
    if (!scribeText.trim()) {
      toast({ title: "No Transcript", description: "Please record or type meeting notes first.", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      await meetingService.summarizeMeeting(scribeMeeting._id, scribeText);
      toast({ title: "AI Scribe Complete!", description: "Structured summary saved to meeting." });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      if (isScribing) SpeechRecognition.stopListening();
      setIsScribing(false);
      setScribeMeeting(null);
    } catch (err: any) {
      toast({ title: "Summarization Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (

    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">Meetings</h1>
            <p className="text-sm text-muted-foreground">Manage your team and client meetings</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton 
              data={filteredMeetings} 
              filename="meetings"
              columns={[
                { header: "Topic", key: "topic" },
                { header: "Date", key: "date" },
                { header: "Time", key: "time" },
                { header: "Members", key: (m) => Array.isArray(m.members) ? m.members.map(memberLabel).join(", ") : m.members },
                { header: "Status", key: "status" },
                { header: "Agenda", key: "agenda" },
                { header: "Summary", key: "summary" }
              ]}
            />
            <ImportButton onData={handleImportData} loading={importMutation.isPending} />
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingMeeting(null)} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                  <Plus className="mr-2 h-4 w-4" />
                  New Meeting
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingMeeting ? "Edit Meeting" : "Schedule New Meeting"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-xs font-bold uppercase tracking-wider">Topic <span className="text-red-500">*</span></Label>
                  <Input id="topic" value={formData.topic} onChange={handleInputChange} placeholder="E.g. Weekly Sync" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider">Date <span className="text-red-500">*</span></Label>
                    <Input id="date" type="date" value={formData.date} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-xs font-bold uppercase tracking-wider">Time</Label>
                    <Input id="time" type="time" value={formData.time} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">Members</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {staffList.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground">No staff found.</div>
                    ) : (
                      staffList.map((s: any) => (
                        <label key={s._id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                          <Checkbox
                            checked={formData.members.includes(s._id)}
                            onCheckedChange={() => toggleMember(s._id)}
                          />
                          <span className="flex-1">{s.firstname} {s.lastname}</span>
                          <Badge variant={s.is_superadmin || s.admin ? "default" : "secondary"} className="text-[10px] uppercase">
                            {s.is_superadmin || s.admin ? "Admin" : "Staff"}
                          </Badge>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleSelectChange('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminder_time" className="text-xs font-bold uppercase tracking-wider">Reminder Alert</Label>
                    <Select value={formData.reminder_time} onValueChange={(v) => handleSelectChange('reminder_time', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">At time of meeting</SelectItem>
                        <SelectItem value="5">5 minutes before</SelectItem>
                        <SelectItem value="10">10 minutes before</SelectItem>
                        <SelectItem value="15">15 minutes before</SelectItem>
                        <SelectItem value="30">30 minutes before</SelectItem>
                        <SelectItem value="60">1 hour before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <Label htmlFor="meeting_link" className="text-xs font-bold uppercase tracking-wider text-blue-700">Google Meet Link <span className="text-red-500">*</span></Label>
                  <Input id="meeting_link" value={formData.meeting_link} onChange={handleInputChange} placeholder="https://meet.google.com/xxx-xxxx-xxx" className="bg-white" />
                  <p className="text-[10px] text-blue-600/80 font-semibold mt-1">
                    Go to <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="underline">meet.google.com/new</a> to create a real meeting, then paste its link here.
                  </p>
                </div>
                

                <div className="space-y-2">
                  <Label htmlFor="agenda" className="text-xs font-bold uppercase tracking-wider">Agenda</Label>
                  <Textarea id="agenda" value={formData.agenda} onChange={handleInputChange} placeholder="What will be discussed?" className="min-h-[80px]" />
                </div>
                {editingMeeting && (
                  <div className="space-y-2">
                    <Label htmlFor="summary" className="text-xs font-bold uppercase tracking-wider">Live Summary</Label>
                    <Textarea id="summary" value={formData.summary} onChange={handleInputChange} placeholder="Meeting notes and outcome..." className="min-h-[80px] border-primary/20 bg-primary/5 focus-visible:ring-primary/20" />
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleSave}>{editingMeeting ? "Update" : "Save"}</Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search meetings..."
                  className="pl-9 h-9 w-full text-sm bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold">Topic</th>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                    <th className="px-6 py-4 font-bold">Members</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Summary</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={5} className="p-4"><Skeleton className="h-12 w-full" /></td>
                      </tr>
                    ))
                  ) : filteredMeetings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">No meetings found.</td>
                    </tr>
                  ) : (
                    filteredMeetings.map((meeting: any) => (
                      <tr key={meeting._id} className="border-b hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div className="font-bold">{meeting.topic}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{meeting.agenda}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-blue-500" />
                            {meeting.date ? formatDate(meeting.date) : "N/A"}
                          </div>
                          {meeting.time && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
                              <Clock className="h-3 w-3" />
                              {meeting.time}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span>{meeting.members && meeting.members.length > 0 ? meeting.members.map(memberLabel).join(", ") : "None"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={meeting.status === 'Completed' ? 'default' : meeting.status === 'Cancelled' ? 'destructive' : 'secondary'} className="font-bold uppercase text-[10px]">
                            {meeting.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-600 line-clamp-2 max-w-xs italic">
                            {meeting.summary || <span className="text-slate-400">No summary yet</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleJoinAndScribe(meeting)}>
                              <Video className="h-3.5 w-3.5" />
                              Join Meet
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 font-bold text-xs"
                              onClick={() => handleStartScribe(meeting)}
                              title="AI Meeting Scribe"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              AI Scribe
                            </Button>
                            
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={() => {
                              const link = meeting.meeting_link || "";
                              if (link) {
                                navigator.clipboard.writeText(link);
                                toast({ title: "Copied!", description: "Meeting link copied to clipboard." });
                              } else {
                                toast({ title: "Error", description: "No link available to copy.", variant: "destructive" });
                              }
                            }} title="Copy Link">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100" onClick={() => handleEdit(meeting)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(meeting._id)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <Dialog open={!!scribeMeeting} onOpenChange={(open) => {
          if (!open) {
            if (isScribing) SpeechRecognition.stopListening();
            setIsScribing(false);
            setScribeMeeting(null);
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-700">
                <Sparkles className="h-5 w-5" />
                AI Meeting Scribe — {scribeMeeting?.topic}
              </DialogTitle>
              <DialogDescription>
                Live Hindi transcript and FuerteAI Q&amp;A log for this meeting — recording starts automatically on Join Meet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="flex items-center justify-between p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${isScribing ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      {isScribing ? "Listening Continuously..." : "Ready to Record"}
                      {isScribeThinking && <span className="text-purple-500 normal-case font-semibold animate-pulse">FuerteAI is answering…</span>}
                    </p>
                    <p className="text-xs text-purple-700/80">
                      {isScribing ? "No wake word needed — answers any CRM question immediately, in Hindi." : "Click Record to start capturing meeting audio automatically."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={scribeLanguage} onValueChange={setScribeLanguage} disabled={isScribing}>
                    <SelectTrigger className="h-9 w-[110px] text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCRIBE_LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant={isScribing ? "destructive" : "default"}
                    size="sm"
                    className={`rounded-xl font-bold text-xs gap-1.5 ${!isScribing && "bg-purple-600 hover:bg-purple-700 text-white"}`}
                    onClick={toggleScribeRecording}
                  >
                    {isScribing ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {isScribing ? "Stop Recording" : "Start Recording"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live Meeting Transcript / Notes
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    You can also type or paste manual notes below
                  </span>
                </div>
                <Textarea
                  value={scribeText}
                  onChange={(e) => setScribeText(e.target.value)}
                  placeholder="Speech from Google Meet will appear here automatically when Recording is on..."
                  className="min-h-[180px] font-mono text-xs leading-relaxed border-purple-200 focus-visible:ring-purple-400"
                />
              </div>

              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Manual Diagnostic Test
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Type a line (no live meeting needed) — always returns a full verdict + reason, never a silent "nothing happened."
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={diagnosticInput}
                    onChange={(e) => setDiagnosticInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRunDiagnostic()}
                    placeholder="e.g. Sharma Construction ka payment aaya ya nahi?"
                    className="text-sm bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDiagnosing || !diagnosticInput.trim()}
                    onClick={handleRunDiagnostic}
                    className="shrink-0 font-bold text-xs"
                  >
                    {isDiagnosing ? "Testing…" : "Test"}
                  </Button>
                </div>
                {diagnosticResult && (
                  <div className="mt-2 p-3 bg-white border rounded-lg text-xs space-y-1 font-mono">
                    <div><span className="text-slate-500">verdict:</span> <span className="font-bold">{diagnosticResult.verdict}</span></div>
                    {diagnosticResult.reply_hi && <div><span className="text-slate-500">reply_hi:</span> {diagnosticResult.reply_hi}</div>}
                    <div><span className="text-slate-500">reason:</span> {diagnosticResult.reason}</div>
                    <div><span className="text-slate-500">had_question_word:</span> {String(diagnosticResult.had_question_word)}</div>
                    {diagnosticResult.name_heard && <div><span className="text-slate-500">name_heard → searched:</span> {diagnosticResult.name_heard} → {diagnosticResult.name_searched}</div>}
                    <div><span className="text-slate-500">records_found:</span> {diagnosticResult.records_found} <span className="text-slate-500 ml-2">confidence:</span> {diagnosticResult.confidence}</div>
                    {diagnosticResult.answer_key && <div><span className="text-slate-500">answer_key:</span> {diagnosticResult.answer_key}</div>}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-3">
              <Button
                variant="outline"
                onClick={() => {
                  if (isScribing) SpeechRecognition.stopListening();
                  setIsScribing(false);
                  setScribeMeeting(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={handleSummarizeScribe}
                disabled={isSummarizing || !scribeText.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 rounded-xl"
              >
                <Sparkles className="h-4 w-4" />
                {isSummarizing ? "AI Summarizing & Saving..." : "Summarize & Save to Meeting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


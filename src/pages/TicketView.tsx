import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ExternalLink,
  Trash2,
  Reply,
  StickyNote,
  Bell,
  Ticket as TicketIcon,
  CheckSquare,
  Paperclip,
  X,
  Plus,
} from "lucide-react";
import { supportService } from "@/api/services/support.service";
import { customerService } from "@/api/services/customer.service";
import { staffService } from "@/api/services/staff.service";
import { fileService } from "@/api/services/file.service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LEFT_TABS = [
  { id: "reply", label: "Add Reply", icon: Reply },
  { id: "note", label: "Add Note", icon: StickyNote },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "other", label: "Other Tickets", icon: TicketIcon },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
];

export default function TicketView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("reply");
  const [replyMessage, setReplyMessage] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [ccInput, setCcInput] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [returnToList, setReturnToList] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [infoForm, setInfoForm] = useState({
    subject: "",
    tags: [] as string[],
    contact: "",
    department: "",
    assigned: "",
    priority: "",
    service: "",
    merge_ticket_no: "",
  });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => supportService.getTicketById(id!),
    enabled: !!id,
  });

  const { data: allTickets = [] } = useQuery<any[]>({
    queryKey: ["tickets"],
    queryFn: supportService.getTickets,
  });

  const { data: allContacts = [] } = useQuery<any[]>({
    queryKey: ["all-contacts"],
    queryFn: customerService.getAllContacts,
  });

  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments"],
    queryFn: supportService.getDepartments,
  });

  const { data: priorities = [] } = useQuery<any[]>({
    queryKey: ["priorities"],
    queryFn: supportService.getPriorities,
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ["services"],
    queryFn: supportService.getServices,
  });

  const { data: ticketStatuses = [] } = useQuery<any[]>({
    queryKey: ["ticket-statuses"],
    queryFn: supportService.getTicketStatuses,
  });

  const { data: staffMembers = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const { data: predefinedReplies = [] } = useQuery<any[]>({
    queryKey: ["predefined-replies"],
    queryFn: supportService.getPredefinedReplies,
  });

  const { data: kbArticles = [] } = useQuery<any[]>({
    queryKey: ["kb-articles"],
    queryFn: () => supportService.getKBArticles(),
  });

  useEffect(() => {
    if (ticket) {
      setInfoForm({
        subject: ticket.subject || "",
        tags: Array.isArray(ticket.tags) ? ticket.tags : [],
        contact: ticket.contact?._id || ticket.contact || "",
        department: ticket.department?._id || ticket.department || "",
        assigned: ticket.assigned?._id || ticket.assigned || "",
        priority: ticket.priority?._id || ticket.priority || "",
        service: ticket.service || "",
        merge_ticket_no: ticket.merge_ticket_no || "",
      });
      setCcInput(ticket.cc || "");
      setStatusValue(ticket.status || "open");
    }
  }, [ticket]);

  const ticketNumber = useMemo(() => {
    const sorted = [...allTickets].sort((a: any, b: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
    const idx = sorted.findIndex((t: any) => t._id === id);
    return idx >= 0 ? idx + 1 : "-";
  }, [allTickets, id]);

  const saveInfoMutation = useMutation({
    mutationFn: (data: any) => supportService.updateTicket(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Saved", description: "Ticket information updated.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to save ticket.", variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: (payload: any) => supportService.addTicketReply(id!, payload),
    onSuccess: async () => {
      if (attachments.length > 0) {
        try {
          await fileService.uploadFiles(id!, "ticket", attachments);
        } catch {
          toast({ title: "Attachment Error", description: "Reply saved, but attachments failed to upload.", variant: "destructive" });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setReplyMessage("");
      setNoteMessage("");
      setAttachments([]);
      toast({ title: "Success", description: activeTab === "note" ? "Note added." : "Response added.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      if (activeTab === "reply" && returnToList) navigate("/admin/support");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => supportService.deleteTicket(id!),
    onSuccess: () => {
      toast({ title: "Deleted", description: "Ticket deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      navigate("/admin/support");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to delete ticket.", variant: "destructive" }),
  });

  const handleAddResponse = () => {
    const isNote = activeTab === "note";
    const message = isNote ? noteMessage : replyMessage;
    if (!message.trim()) {
      toast({ title: "Validation Error", description: "Message cannot be empty.", variant: "destructive" });
      return;
    }
    replyMutation.mutate({
      message,
      is_note: isNote,
      status: isNote ? undefined : statusValue,
      cc: isNote ? undefined : ccInput,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleSaveInfo = () => {
    saveInfoMutation.mutate({
      subject: infoForm.subject,
      tags: infoForm.tags,
      contact: infoForm.contact || undefined,
      department: infoForm.department || undefined,
      assigned: infoForm.assigned || undefined,
      priority: infoForm.priority || undefined,
      service: infoForm.service,
      merge_ticket_no: infoForm.merge_ticket_no,
    });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !infoForm.tags.includes(t)) {
      setInfoForm(p => ({ ...p, tags: [...p.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (t: string) => setInfoForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }));

  const selectedContact = allContacts.find((c: any) => c._id === infoForm.contact);

  if (isLoading || !ticket) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-foreground">#{ticketNumber} - {ticket.subject?.toUpperCase()}</h1>
            <Select value={statusValue} onValueChange={setStatusValue}>
              <SelectTrigger className="h-7 w-32 rounded-full bg-primary/5 border-primary/20 text-xs font-bold text-primary">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {ticketStatuses.map((s: any) => (
                  <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>
                ))}
                {ticketStatuses.length === 0 && (
                  <>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="on hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" title="Open in new tab" onClick={() => window.open(window.location.href, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" className="h-8 w-8 rounded-lg bg-destructive hover:bg-destructive/90" title="Delete Ticket" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          {/* Left panel */}
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1 bg-muted/30 border-b border-border/50 px-2 overflow-x-auto">
              {LEFT_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors",
                    activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" /> {tab.label}
                </button>
              ))}
            </div>

            <CardContent className="p-6">
              {(activeTab === "reply" || activeTab === "note") ? (
                <div className="space-y-4">
                  {activeTab === "reply" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Select onValueChange={(v) => {
                        const r = predefinedReplies.find((pr: any) => pr._id === v);
                        if (r) setReplyMessage(p => (p ? `${p}\n${r.message}` : r.message));
                      }}>
                        <SelectTrigger className="h-9 rounded-lg text-xs">
                          <SelectValue placeholder="Insert predefined reply" />
                        </SelectTrigger>
                        <SelectContent>
                          {predefinedReplies.map((r: any) => (
                            <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={(v) => {
                        const a = kbArticles.find((art: any) => art._id === v);
                        if (a) setReplyMessage(p => (p ? `${p}\n${a.subject}` : a.subject));
                      }}>
                        <SelectTrigger className="h-9 rounded-lg text-xs">
                          <SelectValue placeholder="Insert knowledge base link" />
                        </SelectTrigger>
                        <SelectContent>
                          {kbArticles.map((a: any) => (
                            <SelectItem key={a._id} value={a._id}>{a.subject}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Textarea
                    value={activeTab === "note" ? noteMessage : replyMessage}
                    onChange={(e) => activeTab === "note" ? setNoteMessage(e.target.value) : setReplyMessage(e.target.value)}
                    placeholder={activeTab === "note" ? "Add Note" : "Add Reply"}
                    className="min-h-[180px] rounded-xl border-border/60 resize-none p-4 text-sm"
                  />

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Attachments</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-medium border border-border/60 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/30">
                        <Paperclip className="h-3.5 w-3.5" /> Choose file
                        <input type="file" multiple className="hidden" onChange={handleFileChange} />
                      </label>
                      <span className="text-xs text-muted-foreground">{attachments.length ? `${attachments.length} file(s) selected` : "No file chosen"}</span>
                    </div>
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((f, i) => (
                          <Badge key={i} variant="secondary" className="gap-1 font-normal">
                            {f.name}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {activeTab === "reply" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">CC</Label>
                      <Input value={ccInput} onChange={(e) => setCcInput(e.target.value)} placeholder="email@example.com" className="h-9 rounded-lg" />
                    </div>
                  )}

                  {activeTab === "reply" && (
                    <div className="flex items-center gap-2">
                      <Checkbox id="return-to-list" checked={returnToList} onCheckedChange={(c) => setReturnToList(!!c)} />
                      <Label htmlFor="return-to-list" className="text-xs font-medium cursor-pointer">Return to ticket list after response is submitted</Label>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-xs text-muted-foreground font-medium">
                      Last Reply: {ticket.lastreply ? formatDistanceToNow(new Date(ticket.lastreply), { addSuffix: true }) : "never"}
                    </span>
                    <Button onClick={handleAddResponse} disabled={replyMutation.isPending} className="rounded-lg font-bold">
                      {replyMutation.isPending ? "Saving..." : activeTab === "note" ? "Add Note" : "Add Response"}
                    </Button>
                  </div>

                  {ticket.replies?.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border/40">
                      {[...ticket.replies].reverse().map((r: any, i: number) => (
                        <div key={i} className={cn("rounded-xl p-4 border", r.is_note ? "bg-amber-50 border-amber-200" : "bg-muted/20 border-border/40")}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-foreground">
                              {r.staff ? `${r.staff.firstname} ${r.staff.lastname}` : "Staff"} {r.is_note && <Badge variant="outline" className="ml-1 text-[9px]">Note</Badge>}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(r.date), { addSuffix: true })}</span>
                          </div>
                          <p className="text-xs text-foreground whitespace-pre-wrap">{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-10">
                  {LEFT_TABS.find(t => t.id === activeTab)?.label} — coming soon.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Right panel — Ticket Information */}
          <Card className="rounded-2xl border-border/50 shadow-sm h-fit">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black">Ticket Information</h3>
                <Button size="sm" onClick={handleSaveInfo} disabled={saveInfoMutation.isPending} className="rounded-lg font-bold h-8">
                  {saveInfoMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Tags</Label>
                <div className="flex flex-wrap gap-1.5 border border-border/60 rounded-lg p-2">
                  {infoForm.tags.map(t => (
                    <Badge key={t} variant="secondary" className="gap-1 font-normal">
                      {t}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(t)} />
                    </Badge>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag..."
                    className="flex-1 min-w-[80px] text-xs outline-none bg-transparent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Subject</Label>
                <Input value={infoForm.subject} onChange={(e) => setInfoForm(p => ({ ...p, subject: e.target.value }))} className="h-9 rounded-lg" />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Contact</Label>
                <Select value={infoForm.contact} onValueChange={(v) => setInfoForm(p => ({ ...p, contact: v }))}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="Nothing selected" />
                  </SelectTrigger>
                  <SelectContent>
                    {allContacts.map((c: any) => (
                      <SelectItem key={c._id} value={c._id}>{c.firstname} {c.lastname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Name</Label>
                  <Input value={selectedContact ? `${selectedContact.firstname} ${selectedContact.lastname}` : ""} disabled className="h-9 rounded-lg bg-muted/30" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Email address</Label>
                  <Input value={selectedContact?.email || ""} disabled className="h-9 rounded-lg bg-muted/30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Department</Label>
                <Select value={infoForm.department} onValueChange={(v) => setInfoForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Assign ticket (default is current user)</Label>
                <Select value={infoForm.assigned} onValueChange={(v) => setInfoForm(p => ({ ...p, assigned: v }))}>
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Priority</Label>
                  <Select value={infoForm.priority} onValueChange={(v) => setInfoForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger className="h-9 rounded-lg">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p: any) => (
                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Service</Label>
                  <div className="flex gap-1.5">
                    <Select value={infoForm.service} onValueChange={(v) => setInfoForm(p => ({ ...p, service: v }))}>
                      <SelectTrigger className="h-9 rounded-lg flex-1">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s: any) => (
                          <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg" onClick={() => navigate(`/admin/setup/services`)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Merge Ticket #</Label>
                <Input
                  value={infoForm.merge_ticket_no}
                  onChange={(e) => setInfoForm(p => ({ ...p, merge_ticket_no: e.target.value }))}
                  placeholder="example: 5 or 5,6"
                  className="h-9 rounded-lg"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this ticket?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{ticket.subject}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

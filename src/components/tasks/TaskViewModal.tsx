import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  List,
  Timer,
  Plus,
  HelpCircle,
  Bell,
  Users,
  Paperclip,
  ChevronDown,
  ChevronUp,
  X,
  Edit2
} from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { taskService } from "@/api/services/task.service";
import { utilityService } from "@/api/services/utility.service";
import { timeEntryService } from "@/api/services/time_entry.service";
import { reminderService } from "@/api/services/reminder.service";
import { fileService } from "@/api/services/file.service";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { InquiryOutcomeDialog } from "@/components/tasks/InquiryOutcomeDialog";

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  staffOptions: any[];
  allTasks?: any[]; // for references if needed
}

const taskStatusConfig = [
  { id: 1, label: "Not Started", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  { id: 2, label: "In Progress", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { id: 3, label: "Testing", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { id: 4, label: "Awaiting Feedback", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  { id: 5, label: "Complete", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
];

const priorityLabels: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

export const TaskViewModal = ({ isOpen, onClose, task, staffOptions }: TaskViewModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { symbol } = useCurrency();
  const { user, isAdmin, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");
  const [newChecklist, setNewChecklist] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descText, setDescText] = useState(task?.description || "");
  const [showReminders, setShowReminders] = useState(true);
  const [showAssignees, setShowAssignees] = useState(true);
  const [showFollowers, setShowFollowers] = useState(true);
  const [isEditingAssignees, setIsEditingAssignees] = useState(false);
  const [isEditingFollowers, setIsEditingFollowers] = useState(false);

  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderStaffId, setReminderStaffId] = useState("");
  const [reminderDescription, setReminderDescription] = useState("");
  const [reminderNotifyEmail, setReminderNotifyEmail] = useState(false);

  const [isOutcomeOpen, setIsOutcomeOpen] = useState(false);
  const [isAddChecklistOpen, setIsAddChecklistOpen] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistAssignedTo, setChecklistAssignedTo] = useState("");

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartMs, setTimerStartMs] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets", task?._id],
    queryFn: async () => {
      if (!task) return [];
      const res = await timeEntryService.getTimeEntries();
      const allEntries = Array.isArray(res) ? res : res?.data || [];
      return allEntries.filter((te: any) => te.task === task._id);
    },
    enabled: !!task && isOpen
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["task-reminders", task?._id],
    queryFn: () => reminderService.getReminders(task._id, "task"),
    enabled: !!task && isOpen,
  });

  const { data: taskFiles = [] } = useQuery({
    queryKey: ["task-files", task?._id],
    queryFn: () => fileService.getFiles(task._id, "task"),
    enabled: !!task && isOpen,
  });

  const closeReminderModal = () => {
    setIsAddReminderOpen(false);
    setEditingReminderId(null);
    setReminderDate("");
    setReminderDescription("");
    setReminderNotifyEmail(false);
  };

  const createReminderMutation = useMutation({
    mutationFn: (data: any) => reminderService.createReminder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-reminders", task._id] });
      toast({ title: "Success", description: "Reminder created successfully." });
      closeReminderModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const updateReminderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => reminderService.updateReminder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-reminders", task._id] });
      toast({ title: "Success", description: "Reminder updated successfully." });
      closeReminderModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id: string) => reminderService.deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-reminders", task._id] });
      toast({ title: "Success", description: "Reminder deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: (files: File[]) => fileService.uploadFiles(task._id, "task", files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-files", task._id] });
      toast({ title: "Success", description: "File uploaded successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload file.", variant: "destructive" });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => fileService.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-files", task._id] });
      toast({ title: "Success", description: "File deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerStartMs) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - timerStartMs) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartMs]);

  const updateMutation = useMutation({
    mutationFn: ({ id, isTodo, data }: { id: string; isTodo: boolean; data: any }) => 
      isTodo ? utilityService.updateTodo(id, data) : taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast({ title: "Saved" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  if (!task) return null;

  const currentStatus = taskStatusConfig.find(s => s.id === task.displayStatus) || taskStatusConfig[0];
  const priorityText = priorityLabels[task.displayPriority] || "Medium";

  const handleAddChecklist = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newChecklist.trim()) {
      if (task.isTodo) return; // Simple todos don't have nested checklists right now
      const currentChecklists = task.checklists || [];
      const updatedTask = {
        checklists: [...currentChecklists, { title: newChecklist.trim(), completed: false }]
      };
      updateMutation.mutate({ id: task._id, isTodo: false, data: updatedTask });
      setNewChecklist("");
    }
  };

  const handleToggleChecklist = (index: number, completed: boolean) => {
    if (task.isTodo) return;
    const updatedChecklists = [...(task.checklists || [])];
    updatedChecklists[index].completed = completed;
    updateMutation.mutate({ id: task._id, isTodo: false, data: { checklists: updatedChecklists } });
  };

  const handleOpenAddChecklist = () => {
    if (task.isTodo) return; // Simple todos don't have nested checklists
    setChecklistTitle("");
    setChecklistAssignedTo("");
    setIsAddChecklistOpen(true);
  };

  const handleAddChecklistItem = () => {
    if (!checklistTitle.trim()) {
      toast({ title: "Error", description: "Title is required.", variant: "destructive" });
      return;
    }
    const currentChecklists = task.checklists || [];
    const newItem: any = { title: checklistTitle.trim(), completed: false };
    if (isAdmin && checklistAssignedTo) newItem.assigned_to = checklistAssignedTo;
    updateMutation.mutate({ id: task._id, isTodo: false, data: { checklists: [...currentChecklists, newItem] } });
    setIsAddChecklistOpen(false);
    setChecklistTitle("");
    setChecklistAssignedTo("");
  };

  const handleAddComment = () => {
    if (!newComment.trim() || task.isTodo) return;
    const currentComments = task.comments || [];
    const updatedTask = {
      comments: [...currentComments, { text: newComment.trim() }]
    };
    updateMutation.mutate({ id: task._id, isTodo: false, data: updatedTask });
    setNewComment("");
  };

  const handleSaveDescription = () => {
    if (task.isTodo) return;
    updateMutation.mutate({ id: task._id, isTodo: false, data: { description: descText } });
    setIsEditingDesc(false);
  };

  const toggleStatus = () => {
    const nextStatus = task.displayStatus === 5 ? 1 : 5; // toggle between not started and complete
    // Closing an Inquiry task requires a Won/Lost outcome first
    if (nextStatus === 5 && !task.isTodo && task.category === "Inquiry") {
      setIsOutcomeOpen(true);
      return;
    }
    updateMutation.mutate({
      id: task._id,
      isTodo: task.isTodo,
      data: task.isTodo ? { finished: nextStatus === 5 } : { status: nextStatus }
    });
  };

  const handleOutcomeSelect = (outcome: "Won" | "Lost") => {
    setIsOutcomeOpen(false);
    updateMutation.mutate({
      id: task._id,
      isTodo: false,
      data: { status: 5, inquiry_outcome: outcome },
    });
  };

  const getStaffName = (id: string) => {
    const staff = staffOptions.find(s => s.value === id);
    return staff ? staff.label : "Unknown";
  };

  const handleToggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      const hours = elapsedSeconds / 3600;
      if (hours > 0) {
        timeEntryService.createTimeEntry({
          task: task._id,
          hours,
          date: new Date()
        }).then(() => {
          toast({ title: "Timer Stopped", description: `Time entry saved: ${hours.toFixed(2)} hours` });
          setElapsedSeconds(0);
          setTimerStartMs(null);
          queryClient.invalidateQueries({ queryKey: ["timesheets", task._id] });
        }).catch((err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        });
      } else {
        setElapsedSeconds(0);
        setTimerStartMs(null);
      }
    } else {
      setIsTimerRunning(true);
      setTimerStartMs(Date.now());
      setElapsedSeconds(0);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate([file]);
    }
    e.target.value = "";
  };

  const getFileUrl = (attachmentKey: string) => {
    const apiBase = (import.meta.env.VITE_API_URL as string) || "/api";
    return `${apiBase.replace(/\/api\/?$/, "")}/uploads/${attachmentKey}`;
  };

  // Converts an ISO date string to the "YYYY-MM-DDTHH:mm" value a datetime-local input expects,
  // in the browser's local time (so editing a reminder shows the same wall-clock time it was set to).
  const toDatetimeLocalValue = (isoDate: string) => {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenAddReminder = () => {
    setEditingReminderId(null);
    setReminderDate("");
    setReminderDescription("");
    setReminderNotifyEmail(false);
    setReminderStaffId(user?._id || "");
    setIsAddReminderOpen(true);
  };

  const handleOpenEditReminder = (reminder: any) => {
    setEditingReminderId(reminder._id);
    setReminderDate(toDatetimeLocalValue(reminder.date));
    setReminderDescription(reminder.description || "");
    setReminderNotifyEmail(!!reminder.notify_by_email);
    setReminderStaffId(reminder.staff?._id || reminder.staff || user?._id || "");
    setIsAddReminderOpen(true);
  };

  const handleSaveReminder = () => {
    if (!reminderDate || !reminderDescription.trim()) {
      toast({ title: "Error", description: "Date and description are required.", variant: "destructive" });
      return;
    }
    const payload = {
      rel_id: task._id,
      rel_type: "task",
      staff: isAdmin ? reminderStaffId : user?._id,
      description: reminderDescription.trim(),
      date: reminderDate,
      notify_by_email: reminderNotifyEmail,
    };
    if (editingReminderId) {
      updateReminderMutation.mutate({ id: editingReminderId, data: payload });
    } else {
      createReminderMutation.mutate(payload);
    }
  };

  const handleToggleAssignee = (newIds: string[]) => {
    updateMutation.mutate({ id: task._id, isTodo: false, data: { assignees: newIds } });
  };

  const handleToggleFollower = (newIds: string[]) => {
    updateMutation.mutate({ id: task._id, isTodo: false, data: { followers: newIds } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] h-[85vh] p-0 overflow-hidden flex flex-col bg-white rounded-2xl gap-0 [&>button]:hidden">
        
        {/* Header - Fixed Height */}
        <div className="h-20 border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800">{task.name}</h2>
            <Badge variant="outline" className={`${currentStatus.bg} ${currentStatus.text} ${currentStatus.border} font-bold rounded-lg px-2.5 py-0.5`}>
              {currentStatus.label}
            </Badge>
            {task.public ? (
              <span className="text-xs font-semibold text-slate-500">Public Task</span>
            ) : (
              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                Private Task - <span className="text-primary hover:underline cursor-pointer">Make public</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-slate-200">
            <X className="h-5 w-5 opacity-50" />
          </Button>
        </div>

        {/* Main Body - Flex Row */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Column - Main Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
            
            {/* Top Info & Actions */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Created at {task.dateadded ? formatDate(task.dateadded) : (task.createdAt ? formatDate(task.createdAt) : "Unknown Date")}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={toggleStatus}
                  className={`h-10 w-12 rounded-xl transition-all shadow-none ${task.displayStatus === 5 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
                >
                  <Check className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 w-12 rounded-xl border-slate-200 hover:bg-slate-100">
                      <List className="h-5 w-5 text-slate-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 p-2">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2 py-1.5 mb-1 border-b">Timesheets</div>
                    {timesheets.length > 0 ? (
                      timesheets.map((te: any) => (
                        <div key={te._id} className="flex justify-between items-center px-2 py-2 text-sm border-b last:border-0">
                          <span className="font-medium text-slate-700">{formatDate(te.date)}</span>
                          <Badge variant="secondary" className="font-bold">{te.hours.toFixed(2)} hrs</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-sm text-slate-500 italic text-center">No timesheets logged</div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  onClick={handleToggleTimer}
                  className={`h-10 rounded-xl px-5 gap-2 text-white font-bold tracking-wide shadow-lg transition-all
                    ${isTimerRunning ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
                >
                  <Timer className="h-4 w-4" />
                  {isTimerRunning ? `Stop Timer (${formatTimer(elapsedSeconds)})` : "Start Timer"}
                </Button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 group cursor-pointer w-fit" onClick={() => setIsEditingDesc(true)}>
                <h3 className="font-bold text-slate-800 text-lg">Description</h3>
                <Edit2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
              </div>
              
              {isEditingDesc ? (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <Textarea 
                    value={descText} 
                    onChange={(e) => setDescText(e.target.value)}
                    className="min-h-[120px] rounded-xl border-primary/20 focus-visible:ring-primary/20 resize-none font-medium text-slate-700"
                    placeholder="Add task description..."
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveDescription} size="sm" className="rounded-lg font-bold">Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setIsEditingDesc(false); setDescText(task.description || ""); }} className="rounded-lg font-bold">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {task.description || <span className="text-slate-400 italic font-normal">No description for this task</span>}
                </div>
              )}
            </div>

            <div className="w-full h-px bg-slate-100" />

            {/* Checklist Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Checklist Items</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100" onClick={handleOpenAddChecklist}>
                  <Plus className="h-4 w-4 text-slate-500" />
                </Button>
              </div>

              <div className="space-y-3">
                {task.checklists && task.checklists.length > 0 ? (
                  task.checklists.map((check: any, idx: number) => (
                    <div key={check._id || idx} className="flex items-start gap-3 group">
                      <Checkbox
                        checked={check.completed}
                        onCheckedChange={(c) => handleToggleChecklist(idx, !!c)}
                        className="mt-0.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded-md"
                      />
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${check.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {check.title}
                        </span>
                        {check.assigned_to && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Assigned to {getStaffName(check.assigned_to)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400 font-medium">Checklist items not found for this task</div>
                )}
                
                {!task.isTodo && (
                  <Input 
                    placeholder="Add checklist item... (Press Enter)" 
                    value={newChecklist}
                    onChange={(e) => setNewChecklist(e.target.value)}
                    onKeyDown={handleAddChecklist}
                    className="h-10 rounded-xl border-slate-200 text-sm font-medium bg-slate-50 focus-visible:ring-primary/20 focus-visible:bg-white transition-colors"
                  />
                )}
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            {/* Comments */}
            <div className="space-y-6">
              <h3 className="font-bold text-primary text-lg flex items-center gap-2">
                Comments
                {task.comments && task.comments.length > 0 && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
                    {task.comments.length}
                  </Badge>
                )}
              </h3>
              
              <div className="space-y-5">
                {task.comments && task.comments.map((comment: any, idx: number) => (
                  <div key={comment._id || idx} className="flex gap-4">
                    <Avatar className="h-10 w-10 border border-slate-200 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {getStaffName(comment.added_by).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 bg-slate-50 p-4 rounded-2xl rounded-tl-none w-full border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-800">{getStaffName(comment.added_by)}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(comment.dateadded)}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {!task.isTodo && (
                <div className="flex flex-col gap-3">
                  <Textarea 
                    placeholder="Write a comment..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px] rounded-xl border-slate-200 text-sm font-medium resize-none bg-slate-50 focus-visible:ring-primary/20 focus-visible:bg-white transition-colors"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleAddComment} className="rounded-lg font-bold shadow-md shadow-primary/20 px-6">Post Comment</Button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Column - Sidebar (Scrollable) */}
          <div className="w-[340px] border-l border-slate-200 bg-slate-50 overflow-y-auto flex-shrink-0">
            
            {/* Task Info */}
            <div className="p-6 border-b border-slate-200 space-y-4">
              <div className="flex items-center justify-between text-slate-800">
                <div className="flex items-center gap-2 font-bold">
                  <HelpCircle className="h-4 w-4 opacity-50" />
                  Task Info
                </div>
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full border border-slate-400" />
                  <div className="h-1.5 w-1.5 rounded-full border border-slate-400" />
                  <div className="h-1.5 w-1.5 rounded-full border border-slate-400" />
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">✧</div></div>
                  <span className="text-slate-500 font-medium w-24">Status:</span>
                  <span className="font-bold text-slate-800">{currentStatus.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">🏷️</div></div>
                  <span className="text-slate-500 font-medium w-24">Category:</span>
                  <span className="font-bold text-slate-800">
                    {task.category || "To-Do"}
                    {task.category === "Inquiry" && task.inquiry_outcome && (
                      <span className={`ml-1 ${task.inquiry_outcome === 'Won' ? 'text-green-600' : 'text-red-600'}`}>
                        ({task.inquiry_outcome})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">📅</div></div>
                  <span className="text-slate-500 font-medium w-24">Start Date:</span>
                  <span className="font-bold text-slate-800">{task.startdate ? formatDate(task.startdate) : "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-300">📅</div></div>
                  <span className="text-slate-400 font-medium w-24">Due Date:</span>
                  <span className="font-bold text-slate-400">{task.duedate ? formatDate(task.duedate) : "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">⚡</div></div>
                  <span className="text-slate-500 font-medium w-24">Priority:</span>
                  <span className="font-bold text-cyan-500">{priorityText}</span>
                </div>
                {canUseBranch && task?.branch && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">🏢</div></div>
                    <span className="text-slate-500 font-medium w-24">Branch:</span>
                    <span className="font-bold text-slate-800">{typeof task.branch === "object" ? (task.branch?.name || "-") : task.branch}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">⏱</div></div>
                  <span className="text-slate-500 font-medium w-24">Hourly Rate:</span>
                  <span className="font-bold text-slate-800">{task.hourly_rate ? task.hourly_rate.toFixed(2) : "0.00"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">{symbol}</div></div>
                  <span className="text-slate-500 font-medium w-24">Billable:</span>
                  <span className="font-bold text-slate-800">{task.billable ? "Billable" : "Billable (Not Billed)"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">📄</div></div>
                  <span className="text-slate-500 font-medium w-24">Billed Amount:</span>
                  <span className="font-bold text-slate-800">0.00</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">✱</div></div>
                  <span className="text-slate-500 font-medium w-24">Your time:</span>
                  <span className="font-bold text-slate-800">00:00</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center"><div className="h-4 w-4 text-slate-400">🕒</div></div>
                  <span className="text-slate-500 font-medium w-24">Total logged:</span>
                  <span className="font-bold text-green-600">00:00</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-px h-5 bg-slate-300 ml-3 mr-3" />
                  <span className="text-slate-400 font-medium text-xs">Tag</span>
                </div>
              </div>
            </div>

            {/* Reminders Section */}
            <div className="p-6 border-b border-slate-200">
              <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setShowReminders(!showReminders)}
              >
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Bell className="h-4 w-4 opacity-70" />
                  Reminders
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full group-hover:bg-slate-200"
                  onClick={(e) => { e.stopPropagation(); handleOpenAddReminder(); }}
                >
                  <Plus className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </div>
              {showReminders && (
                <div className="mt-4 space-y-2 animate-in fade-in duration-200">
                  {reminders.length > 0 ? (
                    reminders.map((r: any) => (
                      <div key={r._id} className="flex items-start justify-between gap-2 bg-white rounded-xl border border-slate-200 p-3">
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-bold text-slate-700">{formatDate(r.date)}</div>
                          <div className="text-sm text-slate-600 font-medium break-words">{r.description}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            For {r.staff?.firstname} {r.staff?.lastname}{r.notify_by_email ? " · Email" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-slate-100"
                            onClick={() => handleOpenEditReminder(r)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-red-50 hover:text-red-500"
                            onClick={() => {
                              if (window.confirm("Delete this reminder?")) deleteReminderMutation.mutate(r._id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm font-medium text-slate-500">No reminders for this task</div>
                  )}
                </div>
              )}
            </div>

            {/* Assignees Section */}
            <div className="p-6 border-b border-slate-200 space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Users className="h-4 w-4 opacity-70" />
                Assignees
              </div>
              <div
                className="flex items-center justify-between text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => setIsEditingAssignees(!isEditingAssignees)}
              >
                Assign task to
                <ChevronDown className={`h-4 w-4 transition-transform ${isEditingAssignees ? "rotate-180" : ""}`} />
              </div>
              {isEditingAssignees && (
                <SearchableSelect
                  options={staffOptions}
                  value={task.assignees || []}
                  onValueChange={handleToggleAssignee}
                  multiple
                  placeholder="Select Assignees"
                  className="h-10 rounded-xl border-slate-200 shadow-none bg-white"
                />
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {task.assignees && task.assignees.length > 0 ? (
                  task.assignees.map((id: string) => (
                    <Avatar key={id} className="h-10 w-10 border-2 border-white shadow-sm cursor-pointer hover:-translate-y-1 transition-transform" onClick={() => setIsEditingAssignees(true)}>
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {getStaffName(id).substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))
                ) : (
                  <Avatar className="h-10 w-10 border-2 border-slate-200 border-dashed bg-transparent cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setIsEditingAssignees(true)}>
                    <AvatarFallback className="bg-transparent text-slate-400 font-black">
                      <Plus className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>

            {/* Followers Section */}
            <div className="p-6 border-b border-slate-200 space-y-4">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Users className="h-4 w-4 opacity-70" />
                Followers
              </div>
              <div
                className="flex items-center justify-between text-sm font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors"
                onClick={() => setIsEditingFollowers(!isEditingFollowers)}
              >
                Add Followers
                <ChevronDown className={`h-4 w-4 transition-transform ${isEditingFollowers ? "rotate-180" : ""}`} />
              </div>
              {isEditingFollowers && (
                <SearchableSelect
                  options={staffOptions}
                  value={task.followers || []}
                  onValueChange={handleToggleFollower}
                  multiple
                  placeholder="Select Followers"
                  className="h-10 rounded-xl border-slate-200 shadow-none bg-white"
                />
              )}
              <div className="mt-2 text-sm font-medium text-slate-500">
                {task.followers && task.followers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                     {task.followers.map((id: string) => (
                      <Badge key={id} variant="outline" className="font-bold bg-white">{getStaffName(id)}</Badge>
                     ))}
                  </div>
                ) : (
                  "No followers for this task"
                )}
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div className="p-6 space-y-3">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <div
                onClick={handleFileClick}
                className="border-2 border-dashed border-slate-200 rounded-xl bg-white p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-slate-50 transition-all"
              >
                <Paperclip className="h-5 w-5 text-slate-400" />
                <span className="font-bold text-slate-600 text-sm text-center">
                  {uploadFileMutation.isPending ? "Uploading..." : "Drop files here to upload"}
                </span>
              </div>
              {taskFiles.length > 0 && (
                <div className="space-y-2">
                  {taskFiles.map((f: any) => {
                    const isImage = (f.filetype || "").startsWith("image/");
                    return (
                      <div key={f._id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2">
                        <a
                          href={getFileUrl(f.attachment_key)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          {isImage ? (
                            <img
                              src={getFileUrl(f.attachment_key)}
                              alt={f.file_name}
                              className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                              <Paperclip className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                        </a>
                        <a
                          href={getFileUrl(f.attachment_key)}
                          download={f.file_name}
                          className="text-sm font-medium text-primary hover:underline truncate flex-1"
                        >
                          {f.file_name}
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full shrink-0 hover:bg-red-50 hover:text-red-500"
                          onClick={() => {
                            if (window.confirm("Delete this file?")) deleteFileMutation.mutate(f._id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Inquiry Won/Lost Outcome Modal */}
        <InquiryOutcomeDialog
          isOpen={isOutcomeOpen}
          onClose={() => setIsOutcomeOpen(false)}
          taskName={task.name}
          onSelect={handleOutcomeSelect}
        />

        {/* Add / Edit Reminder Modal */}
        <Dialog open={isAddReminderOpen} onOpenChange={(open) => { if (!open) closeReminderModal(); else setIsAddReminderOpen(true); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingReminderId ? "Edit Reminder" : "Create Reminder"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date to be notified</label>
                <Input
                  type="datetime-local"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="h-11 rounded-xl border-slate-200"
                />
              </div>

              {isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Set reminder to</label>
                  <SearchableSelect
                    options={staffOptions}
                    value={reminderStaffId}
                    onValueChange={(v: string) => setReminderStaffId(v)}
                    placeholder="Select staff member"
                    className="h-11 rounded-xl border-slate-200"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description</label>
                <Textarea
                  value={reminderDescription}
                  onChange={(e) => setReminderDescription(e.target.value)}
                  placeholder="What should this reminder be about?"
                  className="min-h-[90px] rounded-xl border-slate-200 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-by-email"
                  checked={reminderNotifyEmail}
                  onCheckedChange={(c) => setReminderNotifyEmail(!!c)}
                />
                <label htmlFor="notify-by-email" className="text-sm font-medium text-slate-600 cursor-pointer">
                  Send also an email for this reminder
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={closeReminderModal} className="font-bold">Cancel</Button>
              <Button onClick={handleSaveReminder} disabled={createReminderMutation.isPending || updateReminderMutation.isPending} className="font-bold">
                {editingReminderId
                  ? (updateReminderMutation.isPending ? "Saving..." : "Save Changes")
                  : (createReminderMutation.isPending ? "Creating..." : "Create Reminder")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Checklist Item Modal */}
        <Dialog open={isAddChecklistOpen} onOpenChange={setIsAddChecklistOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Checklist Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Title</label>
                <Input
                  value={checklistTitle}
                  onChange={(e) => setChecklistTitle(e.target.value)}
                  placeholder="Checklist item title"
                  className="h-11 rounded-xl border-slate-200"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddChecklistItem(); }}
                />
              </div>

              {isAdmin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign to</label>
                  <SearchableSelect
                    options={staffOptions}
                    value={checklistAssignedTo}
                    onValueChange={(v: string) => setChecklistAssignedTo(v)}
                    placeholder="Select staff member (optional)"
                    className="h-11 rounded-xl border-slate-200"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddChecklistOpen(false)} className="font-bold">Cancel</Button>
              <Button onClick={handleAddChecklistItem} disabled={updateMutation.isPending} className="font-bold">
                {updateMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

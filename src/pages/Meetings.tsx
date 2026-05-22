import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Calendar, Clock, Users, Trash2, Edit, Video, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingService } from "@/api/services/meeting.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dateFormat";
import { Badge } from "@/components/ui/badge";

export default function Meetings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    topic: "",
    agenda: "",
    date: "",
    time: "",
    status: "Scheduled",
    members: "",
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const res = await meetingService.getMeetings();
      return res || [];
    },
  });

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
      members: "",
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
      members: Array.isArray(meeting.members) ? meeting.members.join(", ") : meeting.members || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this meeting?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (!formData.topic || !formData.date) {
      toast({ title: "Validation Error", description: "Topic and Date are required", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      members: formData.members ? formData.members.split(",").map((m) => m.trim()) : [],
    };

    if (editingMeeting) {
      updateMutation.mutate({ id: editingMeeting._id, data: payload });
    } else {
      createMutation.mutate(payload);
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
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingMeeting(null)} className="font-bold uppercase tracking-wider text-xs">
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
                  <Label htmlFor="members" className="text-xs font-bold uppercase tracking-wider">Members</Label>
                  <Input id="members" value={formData.members} onChange={handleInputChange} placeholder="Comma-separated emails or names" />
                </div>
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
                  <Label htmlFor="agenda" className="text-xs font-bold uppercase tracking-wider">Agenda</Label>
                  <Textarea id="agenda" value={formData.agenda} onChange={handleInputChange} placeholder="What will be discussed?" className="min-h-[100px]" />
                </div>
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
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">No meetings found.</td>
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
                            <span>{meeting.members && meeting.members.length > 0 ? meeting.members.join(", ") : "None"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={meeting.status === 'Completed' ? 'default' : meeting.status === 'Cancelled' ? 'destructive' : 'secondary'} className="font-bold uppercase text-[10px]">
                            {meeting.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600" onClick={() => navigate(`/admin/meetings/room/${meeting._id}`)}>
                              <Video className="h-3.5 w-3.5" />
                              Join
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100" onClick={() => {
                              navigator.clipboard.writeText(window.location.origin + `/admin/meetings/room/${meeting._id}`);
                              toast({ title: "Copied!", description: "Meeting link copied to clipboard." });
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
      </div>
    </DashboardLayout>
  );
}

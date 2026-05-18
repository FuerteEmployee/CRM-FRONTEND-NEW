import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { 
  ArrowLeft, 
  Save, 
  Megaphone,
  User,
  Users
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { announcementService } from "@/services/announcement.service";

const AnnouncementCreate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  
  const [formData, setFormData] = useState({
    name: "",
    message: "",
    showtostaff: true,
    showtousers: false,
    showname: true
  });

  const { data: existingAnnouncement, isLoading: isLoadingExisting } = useQuery({
    queryKey: ["announcement", id],
    queryFn: () => announcementService.getAnnouncement(id as string),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingAnnouncement) {
      setFormData({
        name: existingAnnouncement.name || "",
        message: existingAnnouncement.message || "",
        showtostaff: existingAnnouncement.showtostaff ?? true,
        showtousers: existingAnnouncement.showtousers ?? false,
        showname: existingAnnouncement.showname ?? true,
      });
    }
  }, [existingAnnouncement]);

  const mutation = useMutation({
    mutationFn: (data: any) => 
      isEdit 
        ? announcementService.updateAnnouncement(id as string, data)
        : announcementService.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success(isEdit ? "Announcement updated successfully" : "Announcement created successfully");
      navigate("/admin/announcements");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save announcement");
    }
  });

  const handleSave = () => {
    if (!formData.name || !formData.message) {
      toast.error("Subject and Message are required");
      return;
    }
    mutation.mutate(formData);
  };

  if (isEdit && isLoadingExisting) {
    return <DashboardLayout><div className="flex items-center justify-center h-64">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-20 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/admin/announcements")}
              className="rounded-full hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Announcement" : "New Announcement"}</h1>
              <p className="text-muted-foreground text-sm font-medium">Broadcast a message to your team or clients</p>
            </div>
          </div>
        </div>

        {/* Single Column Form */}
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-8 space-y-10">
              {/* Row 1: Subject */}
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Subject *</Label>
                <Input 
                  placeholder="Enter announcement subject..." 
                  className="h-14 text-lg font-bold rounded-xl border-border/50 focus-visible:ring-primary/20 bg-accent/5 px-6"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              {/* Row 2: Message */}
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Message *</Label>
                <RichTextEditor 
                  placeholder="Write your announcement details here..." 
                  value={formData.message}
                  onChange={(content) => setFormData(p => ({ ...p, message: content }))}
                />
              </div>

              {/* Row 3: Visibility Checkboxes */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Visibility & Signature</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Show to Staff */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border/40 hover:border-primary/30 transition-all cursor-pointer group shadow-sm" onClick={() => setFormData(p => ({ ...p, showtostaff: !p.showtostaff }))}>
                    <Checkbox id="staff" checked={formData.showtostaff} className="rounded-md h-5 w-5 data-[state=checked]:bg-primary"/>
                    <div className="flex flex-col gap-0.5 flex-1">
                        <Label htmlFor="staff" className="text-sm font-bold cursor-pointer">Show to Staff</Label>
                        <p className="text-[10px] text-muted-foreground">Visible internally</p>
                    </div>
                    <Users className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Show to Clients */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border/40 hover:border-primary/30 transition-all cursor-pointer group shadow-sm" onClick={() => setFormData(p => ({ ...p, showtousers: !p.showtousers }))}>
                    <Checkbox id="clients" checked={formData.showtousers} className="rounded-md h-5 w-5 data-[state=checked]:bg-primary"/>
                    <div className="flex flex-col gap-0.5 flex-1">
                        <Label htmlFor="clients" className="text-sm font-bold cursor-pointer">Show to Clients</Label>
                        <p className="text-[10px] text-muted-foreground">Visible in portal</p>
                    </div>
                    <User className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Show My Name */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border/40 hover:border-primary/30 transition-all cursor-pointer group shadow-sm" onClick={() => setFormData(p => ({ ...p, showname: !p.showname }))}>
                    <Checkbox id="name" checked={formData.showname} className="rounded-md h-5 w-5 data-[state=checked]:bg-primary"/>
                    <div className="flex flex-col gap-0.5 flex-1">
                        <Label htmlFor="name" className="text-sm font-bold cursor-pointer">Show My Name</Label>
                        <p className="text-[10px] text-muted-foreground">Include signature</p>
                    </div>
                    <Megaphone className="h-4 w-4 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Card Footer Save Button */}
              <div className="flex justify-end pt-6 border-t border-border/40">
                <Button onClick={handleSave} disabled={mutation.isPending} size="sm" className="rounded-lg px-6 h-9 font-bold">
                  <Save className="h-3.5 w-3.5 mr-2" />
                  {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnnouncementCreate;

import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usePermissionContext } from "@/context/PermissionContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { staffService } from "@/api/services/staff.service";
import { formatDate } from "@/lib/dateFormat";
import { Mail, Phone, Briefcase, Calendar, Shield, Save, Loader2, Volume2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOUND_OPTIONS, playNotificationSound } from "@/lib/soundUtils";
import { toast } from "sonner";

const statusConfig = [
  { id: 1, label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: 2, label: "In Progress", color: "bg-primary/10 text-primary border-primary/20" },
  { id: 3, label: "On Hold", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { id: 5, label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
  { id: 4, label: "Finished", color: "bg-green-50 text-green-700 border-green-200" },
];

const Profile = () => {
  const { user, refreshPermissions } = usePermissionContext();
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: projectService.getAll,
  });

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phonenumber: "",
    notification_sound: "default",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        email: user.email || "",
        phonenumber: (user as any).phonenumber || "",
        notification_sound: (user as any).notification_sound || "default",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => staffService.update(user?._id, data),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      refreshPermissions();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update profile");
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id) return;
    updateProfileMutation.mutate(formData);
  };

  const userProjects = useMemo(() => {
    if (!user) return [];
    if (user.admin) return projects;
    return projects.filter((p: any) => {
      const isTeamMember = p.team?.some((m: any) => m._id === user._id || m === user._id);
      const isCreator = p.created_by === user._id || p.addedfrom === user._id;
      return isTeamMember || isCreator;
    });
  }, [projects, user]);

  const initials = user
    ? `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase()
    : "??";

  const roleName = user?.admin ? "Administrator" : (user?.role?.name || (typeof user?.role === "string" ? user.role : "Staff"));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and view your projects</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{user?.firstname} {user?.lastname}</h2>
                <Badge variant="secondary" className="mt-2 font-semibold">
                  <Shield className="w-3 h-3 mr-1" />
                  {roleName}
                </Badge>
                
                <div className="w-full mt-6 space-y-3 text-sm text-left">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary/70" />
                    <span className="truncate">{user?.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary/70" />
                    <span>{(user as any)?.phonenumber || "No phone number"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary/70" />
                    <span>Joined {(user as any)?.datecreated ? formatDate((user as any).datecreated) : "Unknown"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstname">First Name</Label>
                      <Input id="firstname" name="firstname" value={formData.firstname} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastname">Last Name</Label>
                      <Input id="lastname" name="lastname" value={formData.lastname} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phonenumber">Phone Number</Label>
                    <Input id="phonenumber" name="phonenumber" type="tel" value={formData.phonenumber} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10); handleChange(e); }} maxLength={10} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notification Sound</Label>
                    <div className="flex gap-2 items-center">
                      <Select 
                        value={formData.notification_sound} 
                        onValueChange={(val) => {
                          setFormData(prev => ({ ...prev, notification_sound: val }));
                          playNotificationSound(val);
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a sound" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOUND_OPTIONS.map(sound => (
                            <SelectItem key={sound.value} value={sound.value}>
                              {sound.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon" 
                        onClick={() => playNotificationSound(formData.notification_sound)}
                        title="Preview Sound"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Select the sound you want to hear for new notifications.</p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2">
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  My Projects
                </CardTitle>
                <Badge variant="outline">{userProjects.length} Total</Badge>
              </CardHeader>
              <CardContent>
                {isLoadingProjects ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Loading projects...</p>
                ) : userProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No projects assigned.</p>
                ) : (
                  <div className="space-y-4 mt-4">
                    {userProjects.slice(0, 5).map((project: any) => (
                      <div key={project._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-semibold text-sm">{project.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Deadline: {project.deadline ? formatDate(project.deadline) : "None"}
                          </p>
                        </div>
                        <Badge className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter ${statusConfig.find((s: any) => s.id === project.status)?.color || statusConfig[0].color}`}>
                          {statusConfig.find((s: any) => s.id === project.status)?.label || "Unknown"}
                        </Badge>
                      </div>
                    ))}
                    {userProjects.length > 5 && (
                      <p className="text-xs text-center text-muted-foreground pt-2">
                        + {userProjects.length - 5} more projects
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;

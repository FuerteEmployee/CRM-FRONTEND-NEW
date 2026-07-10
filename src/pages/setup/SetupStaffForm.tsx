import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Save,
  Loader2,
  Mail,
  MessageSquare,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  Facebook,
  Linkedin,
  Globe,
  Type,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/api/services/staff.service";
import { supportService } from "@/api/services/support.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Role {
  _id: string;
  name: string;
  permissions: Record<string, any>;
}

const FEATURES_CONFIG = [
  { name: "Bulk PDF Export", caps: ["View(Global)"] },
  {
    name: "Contracts",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "View All Templates",
    ],
  },
  {
    name: "Credit Notes",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Customers",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Email Templates", caps: ["View(Global)", "Edit"] },
  {
    name: "Estimates",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Expenses",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Invoices",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Items", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  {
    name: "Knowledge Base",
    caps: ["View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Payments",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Projects",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "Create Timesheets",
      "Edit Milestones",
      "Delete Milestones",
    ],
  },
  {
    name: "Proposals",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "View All Templates",
    ],
  },
  { name: "Reports", caps: ["View(Global)", "View Timesheets Report"] },
  { name: "Staff Roles", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Settings", caps: ["View(Global)", "Edit"] },
  { name: "Staff", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  {
    name: "Tasks",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "Edit Timesheets (Global)",
      "Edit Own Timesheets",
      "Delete Timesheets (Global)",
      "Delete own Timesheets",
    ],
  },
  { name: "Task Checklist Templates", caps: ["Create", "Delete"] },
  {
    name: "Estimate Request",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Leads", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Goals", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Announcements", caps: ["View(Global)"] },
  { name: "Activity Log", caps: ["View(Global)"] },
  { name: "Ticket Pipe Log", caps: ["View(Global)"] },
];

export default function SetupStaffForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const { can } = usePermissions();
  const [formData, setFormData] = useState<any>({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    phonenumber: "",
    admin: false,
    role: "",
    active: true,
    permissions: {},
    skype: "",
    facebook: "",
    linkedin: "",
    default_language: "System Default",
    email_signature: "",
    direction: "System Default",
    departments: [],
    send_welcome_email: true,
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await staffService.getRoles();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["support-departments"],
    queryFn: async () => {
      const response = await supportService.getDepartments();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const { isLoading: isLoadingStaff } = useQuery({
    queryKey: ["staff", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      const response = await staffService.getById(id);
      const member = response?.data || response;
      if (member) {
        // Ensure we handle Map-like or plain objects correctly (Mongoose Map serialization)
        const staffPerms = member.permissions || {};
        const rolePerms = member.role?.permissions || {};

        // Start with role permissions as base
        const finalPermissions: Record<string, any> = { ...rolePerms };

        // Deeply merge staff overrides (on a per-feature basis)
        Object.entries(staffPerms).forEach(([feature, caps]) => {
          if (caps && typeof caps === "object") {
            finalPermissions[feature] = {
              ...(finalPermissions[feature] || {}),
              ...(caps as any),
            };
          }
        });

        setFormData({
          ...member,
          role: member.role?._id || member.role || "none", // Normalize null/undefined to 'none' match SelectItem value
          password: "",
          permissions: finalPermissions,
          departments: member.departments || [],
        });
      }
      return member;
    },
    enabled: !!id && id !== "new",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => staffService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Success", description: "Staff member created" });
      navigate("/admin/setup/staff");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create staff",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => staffService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Success", description: "Staff member updated" });
      navigate("/admin/setup/staff");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Normalize 'none' role back to null for the backend to avoid BSON error
    const finalData = {
      ...formData,
      role:
        formData.role === "none" || formData.role === "" ? null : formData.role,
    };

    if (id && id !== "new") {
      const { password, ...rest } = finalData;
      const payload = password ? { ...rest, password } : rest;
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(finalData);
    }
  };

  const handleRoleChange = (roleId: string) => {
    const selectedRole = roles.find((r) => r._id === roleId);
    setFormData((prev: any) => ({
      ...prev,
      role: roleId === "none" ? "" : roleId,
      permissions: roleId === "none" ? {} : selectedRole?.permissions || {},
      admin:
        roleId !== "none" &&
        (selectedRole?.name.toLowerCase() === "admin" ||
          selectedRole?.name.toLowerCase() === "super admin")
          ? true
          : roleId === "none"
            ? false
            : prev.admin,
    }));
  };

  const handleTogglePermission = (feature: string, capability: string) => {
    setFormData((prev: any) => {
      const featurePerms = prev.permissions[feature] || {};
      const newFeaturePerms = {
        ...featurePerms,
        [capability]: !featurePerms[capability],
      };
      return {
        ...prev,
        permissions: { ...prev.permissions, [feature]: newFeaturePerms },
      };
    });
  };

  const generatePassword = () => {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < 12; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setFormData({ ...formData, password: retVal });
    setShowPassword(true);
  };

  if (isLoadingStaff) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto p-6 space-y-5">
          <div className="space-y-2">
            <div className="h-7 w-36 bg-muted animate-pulse rounded" />
            <div className="h-4 w-52 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-muted animate-pulse rounded-lg" />
            <div className="h-10 w-20 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const saveDisabled =
    createMutation.isPending ||
    updateMutation.isPending ||
    (id === "new" ? !can("Staff", "Create") : !can("Staff", "Edit"));

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/setup/staff")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">
            {id && id !== "new"
              ? "Edit Staff Member"
              : "Add New Staff Member"}
          </h1>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-white border-b rounded-none w-full justify-start h-12 px-0 gap-8">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-2 font-semibold"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-2 font-semibold"
            >
              Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="profile"
            className="bg-white border rounded-lg p-8 shadow-sm mt-6 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {/* Left Column: Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstname}
                    onChange={(e) =>
                      setFormData({ ...formData, firstname: e.target.value })
                    }
                    className="h-10 border-slate-200"
                    disabled={
                      id === "new"
                        ? !can("Staff", "Create")
                        : !can("Staff", "Edit")
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastname}
                    onChange={(e) =>
                      setFormData({ ...formData, lastname: e.target.value })
                    }
                    className="h-10 border-slate-200"
                    disabled={
                      id === "new"
                        ? !can("Staff", "Create")
                        : !can("Staff", "Edit")
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-10 border-slate-200"
                    disabled={
                      id === "new"
                        ? !can("Staff", "Create")
                        : !can("Staff", "Edit")
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-slate-400" /> Facebook
                  </label>
                  <Input
                    value={formData.facebook}
                    onChange={(e) =>
                      setFormData({ ...formData, facebook: e.target.value })
                    }
                    className="h-10 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-slate-400" /> LinkedIn
                  </label>
                  <Input
                    value={formData.linkedin}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedin: e.target.value })
                    }
                    className="h-10 border-slate-200"
                  />
                </div>
              </div>

              {/* Right Column: Social & Prefs */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" /> Skype
                  </label>
                  <Input
                    value={formData.skype}
                    onChange={(e) =>
                      setFormData({ ...formData, skype: e.target.value })
                    }
                    className="h-10 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" /> Default
                    Language
                  </label>
                  <Select
                    value={formData.default_language}
                    onValueChange={(v) =>
                      setFormData({ ...formData, default_language: v })
                    }
                  >
                    <SelectTrigger className="h-10 border-slate-200">
                      <SelectValue placeholder="System Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="System Default">
                        System Default
                      </SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" /> Email Signature
                  </label>
                  <textarea
                    value={formData.email_signature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        email_signature: e.target.value,
                      })
                    }
                    className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Type className="h-4 w-4 text-slate-400" /> Direction
                  </label>
                  <Select
                    value={formData.direction}
                    onValueChange={(v) =>
                      setFormData({ ...formData, direction: v })
                    }
                  >
                    <SelectTrigger className="h-10 border-slate-200">
                      <SelectValue placeholder="System Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="System Default">
                        System Default
                      </SelectItem>
                      <SelectItem value="LTR">LTR</SelectItem>
                      <SelectItem value="RTL">RTL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t space-y-8">
              {/* Member Departments & Switches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-800">
                    Member departments
                  </p>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 border-dashed">
                    {departments.map((dept: any) => (
                      <div
                        key={dept._id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={dept._id}
                          checked={
                            formData.departments?.includes(dept._id) ||
                            formData.departments?.includes(dept.name)
                          }
                          onCheckedChange={(v) => {
                            const depts = formData.departments || [];
                            setFormData({
                              ...formData,
                              departments: v
                                ? [...depts, dept._id]
                                : depts.filter(
                                    (d: string) =>
                                      d !== dept._id && d !== dept.name,
                                  ),
                            });
                          }}
                          className="border-slate-300"
                          disabled={
                            id === "new"
                              ? !can("Staff", "Create")
                              : !can("Staff", "Edit")
                          }
                        />
                        <label
                          htmlFor={dept._id}
                          className="text-sm font-medium text-foreground cursor-pointer"
                        >
                          {dept.name}
                        </label>
                      </div>
                    ))}
                    {departments.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No departments found. Create them in Setup.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary/20 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />{" "}
                        Administrator
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Full access to all modules and settings.
                      </p>
                    </div>
                    <Switch
                      checked={formData.admin}
                      onCheckedChange={(v) =>
                        setFormData({ ...formData, admin: v })
                      }
                      className="data-[state=checked]:bg-primary"
                      disabled={
                        id === "new"
                          ? !can("Staff", "Create")
                          : !can("Staff", "Edit")
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-primary/20 transition-colors">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        Send welcome email
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Send login details via email.
                      </p>
                    </div>
                    <Checkbox
                      checked={formData.send_welcome_email}
                      onCheckedChange={(v) =>
                        setFormData({ ...formData, send_welcome_email: v })
                      }
                      className="border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section - Matches the bottom placement in reference */}
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-semibold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative group max-w-md">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="h-10 pr-20 border-slate-200"
                    disabled={
                      id === "new"
                        ? !can("Staff", "Create")
                        : !can("Staff", "Edit")
                    }
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-primary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-primary"
                      onClick={generatePassword}
                      disabled={
                        id === "new"
                          ? !can("Staff", "Create")
                          : !can("Staff", "Edit")
                      }
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="permissions"
            className="bg-white border rounded-lg p-8 shadow-sm mt-6 space-y-6"
          >
            <div className="space-y-2 max-w-md">
              <label className="text-sm font-semibold text-slate-700">
                Role
              </label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue placeholder="Nothing selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nothing selected</SelectItem>
                  {roles.map((role: any) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden mt-8">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-bold text-foreground w-1/3 border-r border-slate-200">
                      features
                    </th>
                    <th className="px-6 py-4 font-bold text-foreground">
                      Capabilities
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {FEATURES_CONFIG.map((feature) => (
                    <tr
                      key={feature.name}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-700 font-bold border-r border-slate-200 bg-slate-50/30">
                        {feature.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="grid grid-cols-1 gap-2">
                          {feature.caps.map((cap) => (
                            <div
                              key={cap}
                              className="flex items-center space-x-3 group"
                            >
                              <Checkbox
                                id={`${feature.name}-${cap}`}
                                checked={
                                  !!formData.permissions?.[feature.name]?.[cap]
                                }
                                onCheckedChange={() =>
                                  handleTogglePermission(feature.name, cap)
                                }
                                className="border-slate-300 transition-all data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                disabled={
                                  id === "new"
                                    ? !can("Staff", "Create")
                                    : !can("Staff", "Edit")
                                }
                              />
                              <label
                                htmlFor={`${feature.name}-${cap}`}
                                className="text-[13px] text-foreground font-medium cursor-pointer group-hover:text-primary transition-colors"
                              >
                                {cap}
                              </label>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Always-reachable Save action, pinned bottom-right so long forms/tabs don't require scrolling back to the header */}
      <div className="sticky bottom-6 z-40 w-fit">
        <Button
          onClick={handleSave}
          size="lg"
          className="text-white rounded-xl shadow-lg shadow-primary/30 gap-2 font-bold px-6"
          disabled={saveDisabled}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </DashboardLayout>
  );
}

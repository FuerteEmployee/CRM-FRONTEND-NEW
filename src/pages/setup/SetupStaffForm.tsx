import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LANGUAGES_WITH_SYSTEM_DEFAULT } from "@/lib/languages";
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
  User,
  Camera,
  Briefcase,
  Building2,
  Landmark,
  FileText,
  Upload,
  GraduationCap,
  Droplet,
  Phone,
  MapPin,
  HeartPulse,
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
// HRMS profile fields (Employment Details, Salary & Banking, Legal Documents) are
// collected here too now, so Setup > Staff creates one complete record instead of
// requiring a second visit to the HRMS Staff Directory edit screen. These are the
// exact same services StaffFormPage.tsx (the HRMS "Add Employee" form) uses.
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { departmentService as hrmsDepartmentService } from "@/hrms/services/departmentService";
import { designationService as hrmsDesignationService } from "@/hrms/services/designationService";
import { shiftService as hrmsShiftService } from "@/hrms/services/shiftService";

interface Role {
  _id: string;
  name: string;
  permissions: Record<string, any>;
}

const FEATURES_CONFIG = [
  { name: "Bulk PDF Export", caps: ["View(Global)"] },
  { name: "Chat", caps: ["View(Global)"] },
  { name: "Meetings", caps: ["View(Global)"] },
  { name: "Bookmarks", caps: ["View(Global)"] },
  { name: "Media", caps: ["View(Global)"] },
  { name: "Calendar", caps: ["View(Global)"] },
  { name: "FAQ", caps: ["View(Global)"] },
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
  {
    name: "Purchases",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Reports", caps: ["View(Global)", "View Timesheets Report"] },
  { name: "Staff Roles", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Settings", caps: ["View(Global)", "Edit"] },
  { name: "Staff", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Support", caps: ["View(Global)", "Create", "Edit", "Delete"] },
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
  {
    name: "Leads",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Vendors",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Subscriptions",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Goals", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Announcements", caps: ["View(Global)"] },
  { name: "Activity Log", caps: ["View(Global)"] },
  { name: "Ticket Pipe Log", caps: ["View(Global)"] },
  { name: "HRMS Staff Directory", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Attendance", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Leave Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Expense Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Salary Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Shift Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Branch Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Departments", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Designations", caps: ["View(Global)", "Create", "Edit", "Delete"] },
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Foreign-key selects that must be sent as the literal string "null" (not "" or
// omitted) so the backend's expandDotNotation casts them to a real null instead
// of leaving a stale/invalid ObjectId string in place.
const ID_FIELDS = ["role", "hrmsBranchId", "department", "designation", "shiftId"];

const emptyHrmsProfile = () => ({
  gender: "",
  dob: "",
  bloodGroup: "",
  education: "",
  totalExperience: "",
  residentialPhone: "",
  emergencyContact: { name: "", phone: "", relation: "" },
  address: { current: "", permanent: "" },
  hrmsBranchId: "none",
  department: "none",
  designation: "none",
  shiftId: "none",
  joiningDate: "",
  employmentType: "",
  attendanceRequired: true,
  isSalesperson: false,
  weeklyHolidays: [] as string[],
  bankInfo: { bankName: "", ifscCode: "", accountNumber: "", accountName: "", branchCity: "" },
  payType: "Monthly",
  salaryAmount: 0,
  salaryConfig: {
    basic: { value: 0 },
    hra: { value: 0 },
    pf: { value: 0 },
    esic: { value: 0 },
  },
  legalDocuments: { panNumber: "", aadhaarNumber: "" },
  avatar: "",
});

export default function SetupStaffForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const { can, isStaff, isModuleEnabled } = usePermissions();
  const basePath = isStaff ? "/staff" : "/admin";
  // Employment Details / Salary & Banking / Legal Documents are HRMS-only
  // fields — a tenant whose plan doesn't include the HRMS module shouldn't
  // see or be able to fetch/save them here, same as the HRMS section being
  // hidden from the sidebar for that plan.
  const hrmsEnabled = isModuleEnabled("hrms");
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
    ...emptyHrmsProfile(),
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);

  const fieldsDisabled = id === "new" ? !can("Staff", "Create") : !can("Staff", "Edit");

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

  const { data: hrmsBranches = [] } = useQuery({
    queryKey: ["hrms-branches-picker"],
    queryFn: async () => {
      const res = await hrmsbranchService.getAll();
      return res?.data || [];
    },
    enabled: hrmsEnabled,
  });

  const { data: hrmsDepartments = [] } = useQuery({
    queryKey: ["hrms-departments-picker"],
    queryFn: () => hrmsDepartmentService.getAll(),
    enabled: hrmsEnabled,
  });

  const { data: hrmsDesignations = [] } = useQuery({
    queryKey: ["hrms-designations-picker"],
    queryFn: () => hrmsDesignationService.getAll(),
    enabled: hrmsEnabled,
  });

  const { data: hrmsShifts = [] } = useQuery({
    queryKey: ["hrms-shifts-picker"],
    queryFn: () => hrmsShiftService.getAll(),
    enabled: hrmsEnabled,
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

        const defaults = emptyHrmsProfile();
        setFormData({
          ...member,
          role: member.role?._id || member.role || "none", // Normalize null/undefined to 'none' match SelectItem value
          password: "",
          permissions: finalPermissions,
          departments: member.departments || [],
          gender: member.gender || defaults.gender,
          dob: member.dob ? String(member.dob).substring(0, 10) : defaults.dob,
          bloodGroup: member.bloodGroup || defaults.bloodGroup,
          education: member.education || defaults.education,
          totalExperience: member.totalExperience || defaults.totalExperience,
          residentialPhone: member.residentialPhone || defaults.residentialPhone,
          emergencyContact: { ...defaults.emergencyContact, ...(member.emergencyContact || {}) },
          address: { ...defaults.address, ...(member.address || {}) },
          hrmsBranchId: member.hrmsBranchId || defaults.hrmsBranchId,
          department: member.department || defaults.department,
          designation: member.designation || defaults.designation,
          shiftId: member.shiftId || defaults.shiftId,
          joiningDate: member.joiningDate ? String(member.joiningDate).substring(0, 10) : defaults.joiningDate,
          employmentType: member.employmentType || defaults.employmentType,
          attendanceRequired: member.attendanceRequired !== false,
          isSalesperson: !!member.isSalesperson,
          weeklyHolidays: member.weeklyHolidays || defaults.weeklyHolidays,
          bankInfo: { ...defaults.bankInfo, ...(member.bankInfo || {}) },
          payType: member.payType || defaults.payType,
          salaryAmount: member.salaryAmount || 0,
          salaryConfig: {
            ...defaults.salaryConfig,
            ...(member.salaryConfig || {}),
            basic: { ...defaults.salaryConfig.basic, ...(member.salaryConfig?.basic || {}) },
            hra: { ...defaults.salaryConfig.hra, ...(member.salaryConfig?.hra || {}) },
            pf: { ...defaults.salaryConfig.pf, ...(member.salaryConfig?.pf || {}) },
            esic: { ...defaults.salaryConfig.esic, ...(member.salaryConfig?.esic || {}) },
          },
          legalDocuments: { ...defaults.legalDocuments, ...(member.legalDocuments || {}) },
          avatar: member.avatar || "",
        });
      }
      return member;
    },
    enabled: !!id && id !== "new",
  });

  // Flattens the form's nested fields (bankInfo.accountName, emergencyContact.phone,
  // permissions.<feature>.<cap>, etc.) into FormData with dot-notation keys, plus any
  // selected files — same convention the HRMS "Add Employee" form
  // (hrms/pages/staff/StaffFormPage.tsx) already uses, so the shared backend
  // expandDotNotation() helper reconstructs it identically either way.
  const buildFormData = (data: any): FormData => {
    const fd = new FormData();
    const append = (obj: any, rootKey?: string) => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const fullKey = rootKey ? `${rootKey}.${key}` : key;

        if (ID_FIELDS.includes(key) && (value === "" || value === "none" || value === null || value === undefined)) {
          fd.append(fullKey, "null");
          return;
        }
        if (fullKey === "permissions" && value && typeof value === "object" && Object.keys(value).length === 0) {
          // An empty permissions object (all checkboxes unchecked, or role set to
          // "None") flattens to zero keys below, so nothing would be sent and the
          // backend would leave the staff member's existing permissions untouched.
          // Send an explicit marker so it can tell "cleared" apart from "omitted".
          fd.append("permissionsCleared", "true");
          return;
        }
        if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof File) && !(value instanceof Date)) {
          append(value, fullKey);
          return;
        }
        if (value === undefined || value === null) return;
        if (fullKey === "password" && !value && id !== "new") return;
        if ((fullKey === "dob" || fullKey === "joiningDate") && value === "") return;

        if (Array.isArray(value)) {
          value.forEach((v) => fd.append(fullKey, v));
        } else {
          fd.append(fullKey, value instanceof Date ? value.toISOString() : String(value));
        }
      });
    };
    append(data);
    if (avatarFile) fd.append("avatar", avatarFile);
    if (panFile) fd.append("pan", panFile);
    if (aadhaarFile) fd.append("aadhaar", aadhaarFile);
    if (passportPhotoFile) fd.append("passportPhoto", passportPhotoFile);
    return fd;
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => staffService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Success", description: "Staff member created" });
      navigate(`${basePath}/setup/staff`);
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
      navigate(`${basePath}/setup/staff`);
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
      updateMutation.mutate(buildFormData(payload));
    } else {
      createMutation.mutate(buildFormData(finalData));
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

  const toggleWeeklyHoliday = (day: string) => {
    setFormData((prev: any) => {
      const current: string[] = prev.weeklyHolidays || [];
      return {
        ...prev,
        weeklyHolidays: current.includes(day)
          ? current.filter((d) => d !== day)
          : [...current, day],
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
    fieldsDisabled;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`${basePath}/setup/staff`)}
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
            {hrmsEnabled && (
              <>
                <TabsTrigger
                  value="employment"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-2 font-semibold"
                >
                  Employment Details
                </TabsTrigger>
                <TabsTrigger
                  value="salary"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-2 font-semibold"
                >
                  Salary & Banking
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-2 font-semibold"
                >
                  Legal Documents
                </TabsTrigger>
              </>
            )}
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
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="space-y-1">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer">
                  <Camera className="h-4 w-4" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={fieldsDisabled}
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-xs text-muted-foreground">JPG or PNG.</p>
              </div>
            </div>

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
                    disabled={fieldsDisabled}
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
                    disabled={fieldsDisabled}
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
                    disabled={fieldsDisabled}
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
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Gender</label>
                  <Select
                    value={formData.gender || "none"}
                    onValueChange={(v) => setFormData({ ...formData, gender: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-10 border-slate-200">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
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
                    <SelectContent className="max-h-[300px]">
                      {LANGUAGES_WITH_SYSTEM_DEFAULT.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
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
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-slate-400" /> Blood Group
                  </label>
                  <Input
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    placeholder="e.g. O+"
                    className="h-10 border-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-400" /> Education
                </label>
                <Input
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="e.g. MBA, B.Tech"
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Experience</label>
                <Input
                  value={formData.totalExperience}
                  onChange={(e) => setFormData({ ...formData, totalExperience: e.target.value })}
                  placeholder="e.g. 5 Years"
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" /> Residential Phone
                </label>
                <Input
                  value={formData.residentialPhone}
                  onChange={(e) => setFormData({ ...formData, residentialPhone: e.target.value })}
                  placeholder="10 digit number"
                  className="h-10 border-slate-200"
                />
              </div>
              <div />
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" /> Current Address
                </label>
                <textarea
                  value={formData.address.current}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, current: e.target.value } })}
                  className="w-full min-h-[70px] p-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" /> Permanent Address
                </label>
                <textarea
                  value={formData.address.permanent}
                  onChange={(e) => setFormData({ ...formData, address: { ...formData.address, permanent: e.target.value } })}
                  className="w-full min-h-[70px] p-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>
            </div>

            <div className="pt-8 border-t space-y-4">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" /> Emergency Contact
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Name"
                  value={formData.emergencyContact.name}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                  className="h-10 border-slate-200"
                />
                <Input
                  placeholder="Phone"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                  className="h-10 border-slate-200"
                />
                <Input
                  placeholder="Relation"
                  value={formData.emergencyContact.relation}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relation: e.target.value } })}
                  className="h-10 border-slate-200"
                />
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
                          disabled={fieldsDisabled}
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
                      disabled={fieldsDisabled}
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
                    disableVoice
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="h-10 pr-20 border-slate-200"
                    disabled={fieldsDisabled}
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
                      disabled={fieldsDisabled}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {hrmsEnabled && (
          <>
          <TabsContent
            value="employment"
            className="bg-white border rounded-lg p-8 shadow-sm mt-6 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" /> Branch
                </label>
                <Select
                  value={formData.hrmsBranchId}
                  onValueChange={(v) => setFormData({ ...formData, hrmsBranchId: v })}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {hrmsBranches.map((b: any) => (
                      <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Department</label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => setFormData({ ...formData, department: v })}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {hrmsDepartments.map((d: any) => (
                      <SelectItem key={d._id || d.id} value={d._id || d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-slate-400" /> Designation
                </label>
                <Select
                  value={formData.designation}
                  onValueChange={(v) => setFormData({ ...formData, designation: v })}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {hrmsDesignations.map((d: any) => (
                      <SelectItem key={d._id || d.id} value={d._id || d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Work Shift</label>
                <Select
                  value={formData.shiftId}
                  onValueChange={(v) => setFormData({ ...formData, shiftId: v })}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {hrmsShifts.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>{s.name} ({s.startTime}-{s.endTime})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Joining Date</label>
                <Input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Employment Type</label>
                <Select
                  value={formData.employmentType || "none"}
                  onValueChange={(v) => setFormData({ ...formData, employmentType: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-8 border-t grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">Attendance Tracking</p>
                  <p className="text-xs text-muted-foreground">Require this staff member to punch in/out.</p>
                </div>
                <Switch
                  checked={formData.attendanceRequired}
                  onCheckedChange={(v) => setFormData({ ...formData, attendanceRequired: v })}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">Is Salesperson</p>
                  <p className="text-xs text-muted-foreground">Include in salesperson-linked reports.</p>
                </div>
                <Switch
                  checked={formData.isSalesperson}
                  onCheckedChange={(v) => setFormData({ ...formData, isSalesperson: v })}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            <div className="pt-8 border-t space-y-4">
              <p className="text-sm font-bold text-slate-800">Weekly Holidays</p>
              <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 border-dashed">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`holiday-${day}`}
                      checked={formData.weeklyHolidays.includes(day)}
                      onCheckedChange={() => toggleWeeklyHoliday(day)}
                      className="border-slate-300"
                    />
                    <label htmlFor={`holiday-${day}`} className="text-sm font-medium text-foreground cursor-pointer">
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="salary"
            className="bg-white border rounded-lg p-8 shadow-sm mt-6 space-y-8"
          >
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" /> Bank Details
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Account Holder Name"
                  value={formData.bankInfo.accountName}
                  onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountName: e.target.value } })}
                  className="h-10 border-slate-200"
                />
                <Input
                  placeholder="Account Number"
                  value={formData.bankInfo.accountNumber}
                  onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountNumber: e.target.value } })}
                  className="h-10 border-slate-200"
                />
                <Input
                  placeholder="Bank Name"
                  value={formData.bankInfo.bankName}
                  onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, bankName: e.target.value } })}
                  className="h-10 border-slate-200"
                />
                <Input
                  placeholder="IFSC Code"
                  value={formData.bankInfo.ifscCode}
                  onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, ifscCode: e.target.value.toUpperCase() } })}
                  className="h-10 border-slate-200"
                />
                <Input
                  placeholder="Branch City"
                  value={formData.bankInfo.branchCity}
                  onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, branchCity: e.target.value } })}
                  className="h-10 border-slate-200"
                />
              </div>
            </div>

            <div className="pt-8 border-t space-y-4">
              <p className="text-sm font-bold text-slate-800">Salary</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Pay Type</label>
                  <Select
                    value={formData.payType}
                    onValueChange={(v) => setFormData({ ...formData, payType: v })}
                  >
                    <SelectTrigger className="h-10 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Daily">Daily</SelectItem>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Salary Amount</label>
                  <Input
                    type="number"
                    value={formData.salaryAmount}
                    onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                    className="h-10 border-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Basic</label>
                  <Input
                    type="number"
                    value={formData.salaryConfig.basic.value}
                    onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, basic: { value: e.target.value } } })}
                    className="h-10 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">HRA</label>
                  <Input
                    type="number"
                    value={formData.salaryConfig.hra.value}
                    onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, hra: { value: e.target.value } } })}
                    className="h-10 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">PF</label>
                  <Input
                    type="number"
                    value={formData.salaryConfig.pf.value}
                    onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, pf: { value: e.target.value } } })}
                    className="h-10 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">ESIC</label>
                  <Input
                    type="number"
                    value={formData.salaryConfig.esic.value}
                    onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, esic: { value: e.target.value } } })}
                    className="h-10 border-slate-200"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="documents"
            className="bg-white border rounded-lg p-8 shadow-sm mt-6 space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" /> PAN Number
                  </label>
                  <Input
                    value={formData.legalDocuments.panNumber}
                    onChange={(e) => setFormData({ ...formData, legalDocuments: { ...formData.legalDocuments, panNumber: e.target.value.toUpperCase() } })}
                    className="h-10 border-slate-200"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {panFile ? panFile.name : formData.legalDocuments.panUrl ? "Replace PAN document" : "Upload PAN document"}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" /> Aadhaar Number
                  </label>
                  <Input
                    value={formData.legalDocuments.aadhaarNumber}
                    onChange={(e) => setFormData({ ...formData, legalDocuments: { ...formData.legalDocuments, aadhaarNumber: e.target.value } })}
                    className="h-10 border-slate-200"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {aadhaarFile ? aadhaarFile.name : formData.legalDocuments.aadhaarUrl ? "Replace Aadhaar document" : "Upload Aadhaar document"}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700">Passport-style Photo</p>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {passportPhotoFile ? passportPhotoFile.name : formData.legalDocuments.passportPhotoUrl ? "Replace photo" : "Upload photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setPassportPhotoFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
          </TabsContent>
          </>
          )}

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
                                disabled={fieldsDisabled}
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

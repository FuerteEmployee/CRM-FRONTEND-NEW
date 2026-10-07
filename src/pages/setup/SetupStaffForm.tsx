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
  Phone,
  MapPin,
  Users,
  Search,
  CreditCard,
  Info,
  Zap,
  AlertCircle,
  Plus,
  X,
  File as FileIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/api/services/staff.service";
import { supportService } from "@/api/services/support.service";
import { customerService } from "@/api/services/customer.service";
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
import { salespersonService } from "@/hrms/services/salespersonService";
import { managingCompanyService, type ManagingCompany } from "@/hrms/services/managingCompanyService";
import { ManageCompaniesDialog } from "@/hrms/components/staff/ManageCompaniesDialog";
import { ConfirmProvider } from "@/hrms/contexts/ConfirmContext";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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
  { name: "WhatsApp", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Marketing Spend", caps: ["View(Global)", "Create", "Edit", "Delete"] },
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
const ID_FIELDS = ["role", "hrmsBranchId", "department", "designation", "shiftId", "managingCompanyId"];

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
    pf: { value: 0, isIncluded: false, mode: "per_day" as "fixed_monthly" | "per_day" },
    esic: { value: 0 },
  },
  legalDocuments: { panNumber: "", aadhaarNumber: "" },
  avatar: "",
  // Managing company (matches HRMS's StaffFormPage.tsx staffSchema)
  salaryManagedBy: "screen_time" as "screen_time" | "branch",
  managingCompanyId: "",
  // Salesperson Profile (matches HRMS's StaffFormPage.tsx staffSchema)
  salespersonCode: "",
  salespersonSince: "",
  accountGroup: "Sales Ledger",
  category: "SALES EXECUTIVE",
  incentiveAccount: "",
  incentiveSharingPercent: 0,
  primaryIncentivePercent: 0,
  isSalespersonManager: false,
  underManagerId: "",
  salespersonRemarks: "",
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

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients-for-staff-form"],
    queryFn: async () => {
      const res = await customerService.getAll();
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  useEffect(() => {
    if (id && id !== "new" && clients.length > 0) {
      const assignedIds = clients
        .filter((c: any) => {
          const isAdmin = Array.isArray(c.admins) && c.admins.some((a: any) => {
            const sid = a.staff?._id || a.staff;
            return sid && sid.toString() === id;
          });
          const isSales = (c.sales_person?._id || c.sales_person)?.toString() === id;
          return isAdmin || isSales;
        })
        .map((c: any) => c._id);
      setSelectedClientIds(assignedIds);
    }
  }, [id, clients]);

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

  // Direct Reporting Manager options for the Salesperson Profile section —
  // same source HRMS's StaffFormPage.tsx uses (only real salespersons marked
  // as managers can be selected as someone's manager).
  const { data: salespersonManagers = [] } = useQuery({
    queryKey: ["salesperson-managers-picker"],
    queryFn: async () => {
      const list = await salespersonService.getAll();
      return list.filter((s: any) => s.isManager);
    },
    enabled: hrmsEnabled,
  });

  const [companiesDialogOpen, setCompaniesDialogOpen] = useState(false);
  const { data: managingCompanies = [], refetch: refetchManagingCompanies } = useQuery<ManagingCompany[]>({
    queryKey: ["managing-companies-picker"],
    queryFn: () => managingCompanyService.list(),
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
          salaryManagedBy: member.salaryManagedBy || defaults.salaryManagedBy,
          managingCompanyId: (member.managingCompanyId && typeof member.managingCompanyId === "object")
            ? (member.managingCompanyId._id || member.managingCompanyId.id || "")
            : (member.managingCompanyId || defaults.managingCompanyId),
          salespersonCode: member.salespersonCode || defaults.salespersonCode,
          salespersonSince: member.salespersonSince ? String(member.salespersonSince).substring(0, 10) : defaults.salespersonSince,
          accountGroup: member.accountGroup || defaults.accountGroup,
          category: member.category || defaults.category,
          incentiveAccount: member.incentiveAccount || defaults.incentiveAccount,
          incentiveSharingPercent: member.incentiveSharingPercent ?? defaults.incentiveSharingPercent,
          primaryIncentivePercent: member.primaryIncentivePercent ?? defaults.primaryIncentivePercent,
          isSalespersonManager: !!member.isSalespersonManager,
          underManagerId: (member.underManagerId && typeof member.underManagerId === "object")
            ? (member.underManagerId._id || member.underManagerId.id || "")
            : (member.underManagerId || defaults.underManagerId),
          salespersonRemarks: member.salespersonRemarks || defaults.salespersonRemarks,
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
    mutationFn: async (data: any) => {
      const res = await staffService.create(data);
      const member = res?.data || res;
      const newId = member?._id || member?.id;
      if (newId) {
        await customerService.transferOrAssign({
          toStaffId: newId,
          clientIds: selectedClientIds,
          assignAs: "both",
          sync: true,
        });
      }
      return res;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (res?.hrmsSyncWarning) {
        toast({ title: "Staff created", description: res.hrmsSyncWarning, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Staff member created and customer assignments saved" });
      }
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
    mutationFn: async (data: any) => {
      const res = await staffService.update(id!, data);
      await customerService.transferOrAssign({
        toStaffId: id!,
        clientIds: selectedClientIds,
        assignAs: "both",
        sync: true,
      });
      return res;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      if (res?.hrmsSyncWarning) {
        toast({ title: "Staff updated", description: res.hrmsSyncWarning, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Staff member and customer assignments updated" });
      }
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

  // Mirrors HRMS's StaffFormPage.tsx `staffSchema` (zod) required-field rules,
  // since this file uses plain useState rather than react-hook-form/zod.
  const validateForm = (): string[] => {
    const errors: string[] = [];
    const isCreate = !id || id === "new";
    const tenDigits = /^\d{10}$/;

    if (!formData.firstname.trim()) errors.push("First name is required");
    if (!formData.lastname.trim()) errors.push("Last name is required");
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) errors.push("A valid email address is required");
    if (!tenDigits.test(formData.phonenumber)) errors.push("Mobile number must be exactly 10 digits");

    if (isCreate && !formData.password.trim()) {
      errors.push("Password is required for new accounts");
    } else if (formData.password && formData.password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }

    if (formData.residentialPhone && !tenDigits.test(formData.residentialPhone)) {
      errors.push("Residential phone must be exactly 10 digits");
    }
    if (formData.emergencyContact.phone && !tenDigits.test(formData.emergencyContact.phone)) {
      errors.push("Emergency contact phone must be exactly 10 digits");
    }
    if (formData.salaryManagedBy === "branch" && !formData.managingCompanyId) {
      errors.push("Managing company is required for branch-managed employees");
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        title: "Please fix the following before saving",
        description: errors.join(" • "),
        variant: "destructive",
      });
      return;
    }

    // Normalize 'none' role back to null for the backend to avoid BSON error
    const roleId = formData.role === "none" || formData.role === "" ? null : formData.role;
    const finalData = {
      ...formData,
      role: roleId,
    };

    // Calculate ONLY the overrides (differences) from the selected Role's permissions.
    // staff.permissions should only contain what's explicitly different from their role,
    // otherwise any future updates to the Role itself won't cascade to this user because
    // they have a static copy saved directly on their profile.
    const selectedRole = roles.find((r) => r._id === formData.role);
    const rolePerms = selectedRole?.permissions || {};
    const overrides: Record<string, any> = {};

    Object.keys(formData.permissions || {}).forEach((feature) => {
      const caps = formData.permissions[feature] || {};
      Object.keys(caps).forEach((cap) => {
        const staffVal = !!caps[cap];
        const roleVal = !!rolePerms[feature]?.[cap];
        
        // If the staff member's checkbox differs from the base Role, save it as an override
        if (staffVal !== roleVal) {
          if (!overrides[feature]) overrides[feature] = {};
          overrides[feature][cap] = staffVal;
        }
      });
    });

    finalData.permissions = overrides;

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

  const filteredClients = clients.filter((c: any) => {
    const term = clientSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      c.company?.toLowerCase().includes(term) ||
      c.contact_person?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phonenumber?.includes(term)
    );
  });

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((i) => i !== clientId) : [...prev, clientId]
    );
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
      <div className="space-y-6 pb-20 bg-white min-h-screen">
        <div className="flex items-center justify-between border-b-[0.8px] border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`${basePath}/setup/staff`)}
              className="rounded-full hover:bg-slate-100 text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-[#1a1a1a]">
              {id && id !== "new"
                ? "Edit Staff Member"
                : "Add New Staff Member"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate(`${basePath}/setup/staff`)}
              className="h-9 px-5 text-slate-600 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveDisabled}
              className="gradient-primary text-white border-0 rounded-md h-9 px-6 font-medium shadow-sm flex items-center gap-2"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {id && id !== "new" ? "Update Profile" : "Save Staff"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="h-10 bg-transparent p-0 gap-6 border-b border-slate-300 w-full justify-start rounded-none mb-6 overflow-x-auto">
            <TabsTrigger
              value="profile"
              className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap"
            >
              Identity & Personal
            </TabsTrigger>
            {hrmsEnabled && (
              <>
                <TabsTrigger
                  value="employment"
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap"
                >
                  Employment Details
                </TabsTrigger>
                <TabsTrigger
                  value="salary"
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap"
                >
                  Salary & Banking
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap"
                >
                  Legal Documents
                </TabsTrigger>
                {formData.isSalesperson && (
                  <TabsTrigger
                    value="salesperson"
                    className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap"
                  >
                    Salesperson Profile
                  </TabsTrigger>
                )}
              </>
            )}
            <TabsTrigger
              value="permissions"
              className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap"
            >
              Permissions
            </TabsTrigger>
            <TabsTrigger
              value="assigned-customers"
              className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              <Users className="h-4 w-4" />
              Assigned Customers {selectedClientIds.length > 0 && `(${selectedClientIds.length})`}
            </TabsTrigger>
          </TabsList>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-10">
          <TabsContent
            value="profile"
            className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="flex flex-col md:flex-row gap-10">
              <div className="w-full md:w-1/3 flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className="h-40 w-40 rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center group">
                    {avatarFile ? (
                      <img src={URL.createObjectURL(avatarFile)} alt="Avatar preview" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : formData.avatar ? (
                      <img src={formData.avatar} alt="Avatar" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <User className="h-16 w-16" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest">No Photo</span>
                      </div>
                    )}
                    <div
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer backdrop-blur-[1px]"
                      onClick={() => !fieldsDisabled && document.getElementById("setup-staff-avatar-upload")?.click()}
                    >
                      <Camera className="h-6 w-6 text-white mb-1" />
                      <span className="text-[9px] font-semibold text-white uppercase tracking-widest">Update</span>
                    </div>
                  </div>
                  <input
                    id="setup-staff-avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={fieldsDisabled}
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-semibold text-[#1a1a1a]">Profile Picture</h3>
                  <p className="text-[11px] text-slate-500 font-medium">JPG or PNG.</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.firstname}
                    onChange={(e) =>
                      setFormData({ ...formData, firstname: e.target.value })
                    }
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lastname}
                    onChange={(e) =>
                      setFormData({ ...formData, lastname: e.target.value })
                    }
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.phonenumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phonenumber: e.target.value.replace(/\D/g, "").slice(0, 10) })
                    }
                    placeholder="9876543210"
                    inputMode="numeric"
                    maxLength={10}
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                    disabled={fieldsDisabled}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Gender</label>
                  <Select
                    value={formData.gender || "none"}
                    onValueChange={(v) => setFormData({ ...formData, gender: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Date of Birth</label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Blood Group</label>
                <Input
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  placeholder="e.g. O+"
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Education</label>
                <Input
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="e.g. MBA, B.Tech"
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Experience</label>
                <Input
                  value={formData.totalExperience}
                  onChange={(e) => setFormData({ ...formData, totalExperience: e.target.value })}
                  placeholder="e.g. 5 Years"
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Residential Phone</label>
                <Input
                  value={formData.residentialPhone}
                  onChange={(e) => setFormData({ ...formData, residentialPhone: e.target.value })}
                  placeholder="10 digit number"
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" /> Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Contact Name</label>
                  <Input
                    placeholder="Full Name"
                    value={formData.emergencyContact.name}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, name: e.target.value } })}
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Contact Phone</label>
                  <Input
                    placeholder="10 digit number"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, phone: e.target.value } })}
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Relation</label>
                  <Input
                    placeholder="e.g. Spouse"
                    value={formData.emergencyContact.relation}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: { ...formData.emergencyContact, relation: e.target.value } })}
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Residential Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Current Address</label>
                  <textarea
                    value={formData.address.current}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, current: e.target.value } })}
                    className="w-full min-h-[70px] p-3 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Permanent Address</label>
                  <textarea
                    value={formData.address.permanent}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, permanent: e.target.value } })}
                    className="w-full min-h-[70px] p-3 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* CRM-only fields — no HRMS equivalent to match, kept as their own section */}
            <div className="pt-8 border-t space-y-4">
              <p className="text-sm font-bold text-slate-800">CRM Profile & Preferences</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-slate-400" /> Skype
                  </label>
                  <Input
                    value={formData.skype}
                    onChange={(e) =>
                      setFormData({ ...formData, skype: e.target.value })
                    }
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1 flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-slate-400" /> Facebook
                  </label>
                  <Input
                    value={formData.facebook}
                    onChange={(e) =>
                      setFormData({ ...formData, facebook: e.target.value })
                    }
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1 flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-slate-400" /> LinkedIn
                  </label>
                  <Input
                    value={formData.linkedin}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedin: e.target.value })
                    }
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" /> Default
                    Language
                  </label>
                  <Select
                    value={formData.default_language}
                    onValueChange={(v) =>
                      setFormData({ ...formData, default_language: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1 flex items-center gap-2">
                    <Type className="h-4 w-4 text-slate-400" /> Direction
                  </label>
                  <Select
                    value={formData.direction}
                    onValueChange={(v) =>
                      setFormData({ ...formData, direction: v })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1 flex items-center gap-2">
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
                    className="w-full min-h-[80px] p-3 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
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
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">
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
            className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Branch</label>
                <Select
                  value={formData.hrmsBranchId}
                  onValueChange={(v) => setFormData({ ...formData, hrmsBranchId: v })}
                >
                  <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Department</label>
                <Select
                  value={formData.department}
                  onValueChange={(v) => setFormData({ ...formData, department: v })}
                >
                  <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Designation</label>
                <Select
                  value={formData.designation}
                  onValueChange={(v) => setFormData({ ...formData, designation: v })}
                >
                  <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Work Shift</label>
                <Select
                  value={formData.shiftId}
                  onValueChange={(v) => setFormData({ ...formData, shiftId: v })}
                >
                  <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Joining Date</label>
                <Input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                />
              </div>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-[#1a1a1a]">Employment Options</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Employment Type</label>
                  <Select
                    value={formData.employmentType || "none"}
                    onValueChange={(v) => setFormData({ ...formData, employmentType: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
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
                <div className="flex flex-row items-center justify-between p-3 rounded-lg bg-white border border-slate-200 mt-5">
                  <div className="space-y-0.5">
                    <label className="text-[13px] font-semibold text-[#333333]">Attendance Tracking</label>
                    <p className="text-[10px] text-slate-500">Require biometrics/check-in</p>
                  </div>
                  <Checkbox
                    checked={formData.attendanceRequired}
                    onCheckedChange={(v) => setFormData({ ...formData, attendanceRequired: !!v })}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                </div>
                <div className="flex flex-row items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                  <div className="space-y-0.5">
                    <label className="text-[13px] font-semibold text-[#333333]">Is Salesperson</label>
                    <p className="text-[10px] text-slate-500">Can be assigned to sales vouchers & invoices</p>
                  </div>
                  <Checkbox
                    checked={formData.isSalesperson}
                    onCheckedChange={(v) => setFormData({ ...formData, isSalesperson: !!v })}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Weekly Holidays</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="flex items-center gap-2 p-2 rounded-md border border-slate-100 bg-white">
                      <Checkbox
                        checked={formData.weeklyHolidays.includes(day)}
                        onCheckedChange={() => toggleWeeklyHoliday(day)}
                      />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{day.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="salary"
            className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg gradient-primary text-white flex items-center justify-center shadow-sm">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1a1a1a]">Bank Account Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Bank Name</label>
                    <Input
                      placeholder="e.g. HDFC Bank"
                      value={formData.bankInfo.bankName}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, bankName: e.target.value } })}
                      className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">IFSC Code</label>
                    <Input
                      placeholder="HDFC0001234"
                      value={formData.bankInfo.ifscCode}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, ifscCode: e.target.value.toUpperCase() } })}
                      className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm uppercase"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Account Number</label>
                    <Input
                      placeholder="Enter full account number"
                      value={formData.bankInfo.accountNumber}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountNumber: e.target.value } })}
                      className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Beneficiary Name</label>
                    <Input
                      placeholder="Name on account"
                      value={formData.bankInfo.accountName}
                      onChange={(e) => setFormData({ ...formData, bankInfo: { ...formData.bankInfo, accountName: e.target.value } })}
                      className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-[#1a1a1a]">Salary Configuration</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Total CTC</p>
                    <p className="text-xl font-bold text-emerald-600">₹{Number(formData.salaryAmount || 0).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Pay Cycle</label>
                      <Select
                        value={formData.payType}
                        onValueChange={(v) => setFormData({ ...formData, payType: v })}
                      >
                        <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
                          <SelectValue placeholder="Pay Type" />
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
                      <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Base Salary (₹)</label>
                      <Input
                        type="number"
                        value={formData.salaryAmount}
                        onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                        className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Salary Managed By</label>
                      <Select
                        value={formData.salaryManagedBy}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            salaryManagedBy: v,
                            managingCompanyId: v === "screen_time" ? "" : formData.managingCompanyId,
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="screen_time">Screen Time (Internal)</SelectItem>
                          <SelectItem value="branch">Branch / External Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.salaryManagedBy === "branch" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Managing Company</label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setCompaniesDialogOpen(true)}
                            disabled={fieldsDisabled}
                          >
                            Manage
                          </Button>
                        </div>
                        <Select
                          value={formData.managingCompanyId || "none"}
                          onValueChange={(v) => setFormData({ ...formData, managingCompanyId: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">*None</SelectItem>
                            {managingCompanies.map((c) => (
                              <SelectItem key={c._id || c.id} value={c._id || c.id || ""}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-6">
                    <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-primary" /> Salary Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Basic Salary</label>
                        <Input
                          type="number"
                          value={formData.salaryConfig.basic.value}
                          onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, basic: { value: e.target.value } } })}
                          className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">HRA</label>
                        <Input
                          type="number"
                          value={formData.salaryConfig.hra.value}
                          onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, hra: { value: e.target.value } } })}
                          className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                        />
                      </div>
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] gap-4 p-3 rounded-md border border-slate-200 bg-slate-50/60">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">PF Applicable</label>
                          <div className="flex items-center gap-2 h-10">
                            <Switch
                              checked={!!formData.salaryConfig.pf.isIncluded}
                              onCheckedChange={(checked) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, pf: { ...formData.salaryConfig.pf, isIncluded: checked } } })}
                            />
                            <span className="text-sm text-slate-600">{formData.salaryConfig.pf.isIncluded ? "Yes" : "No"}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">PF Calculation</label>
                          <select
                            value={formData.salaryConfig.pf.mode || "per_day"}
                            disabled={!formData.salaryConfig.pf.isIncluded}
                            onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, pf: { ...formData.salaryConfig.pf, mode: e.target.value as "fixed_monthly" | "per_day" } } })}
                            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-[#333333] disabled:opacity-50"
                          >
                            <option value="fixed_monthly">Fixed monthly</option>
                            <option value="per_day">Per day</option>
                          </select>
                          <p className="text-[10px] text-slate-500">
                            {formData.salaryConfig.pf.mode === "fixed_monthly"
                              ? "Full amount every month, regardless of attendance."
                              : "Scaled by payable days in the month."}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">PF (Employee) / month</label>
                          <Input
                            type="number"
                            value={formData.salaryConfig.pf.value}
                            disabled={!formData.salaryConfig.pf.isIncluded}
                            onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, pf: { ...formData.salaryConfig.pf, value: e.target.value } } })}
                            className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                          />
                          <p className="text-[10px] text-slate-500">Leave 0 to use 12% of Basic.</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">ESIC</label>
                        <Input
                          type="number"
                          value={formData.salaryConfig.esic.value}
                          onChange={(e) => setFormData({ ...formData, salaryConfig: { ...formData.salaryConfig, esic: { value: e.target.value } } })}
                          className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="documents"
            className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* PAN Card */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">PAN Number</label>
                  <Input
                    placeholder="ABCDE1234F"
                    value={formData.legalDocuments.panNumber}
                    onChange={(e) => setFormData({ ...formData, legalDocuments: { ...formData.legalDocuments, panNumber: e.target.value.toUpperCase() } })}
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm uppercase"
                  />
                </div>
                <div
                  className="h-56 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                  onClick={() => document.getElementById("setup-staff-pan-upload")?.click()}
                >
                  {panFile ? (
                    panFile.type === "application/pdf" || panFile.name.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileIcon className="h-10 w-10 text-red-500" />
                        <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">{panFile.name}</span>
                      </div>
                    ) : (
                      <img src={URL.createObjectURL(panFile)} alt="PAN" className="h-full w-full object-cover rounded-md" />
                    )
                  ) : formData.legalDocuments.panUrl ? (
                    formData.legalDocuments.panUrl.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileIcon className="h-10 w-10 text-red-500" />
                        <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">PAN Document (PDF)</span>
                      </div>
                    ) : (
                      <img src={formData.legalDocuments.panUrl} alt="PAN" className="h-full w-full object-cover rounded-md" />
                    )
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-md bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-105 transition-transform"><Plus className="h-5 w-5" /></div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Upload PAN</span>
                    </>
                  )}
                  {(panFile || formData.legalDocuments.panUrl) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPanFile(null);
                        setFormData({ ...formData, legalDocuments: { ...formData.legalDocuments, panUrl: "" } });
                      }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      aria-label="Remove PAN document"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <input id="setup-staff-pan-upload" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                </div>
              </div>

              {/* Aadhaar Card */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Aadhaar Number</label>
                  <Input
                    placeholder="1234 5678 9012"
                    value={formData.legalDocuments.aadhaarNumber}
                    onChange={(e) => setFormData({ ...formData, legalDocuments: { ...formData.legalDocuments, aadhaarNumber: e.target.value } })}
                    className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  />
                </div>
                <div
                  className="h-56 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                  onClick={() => document.getElementById("setup-staff-aadhaar-upload")?.click()}
                >
                  {aadhaarFile ? (
                    aadhaarFile.type === "application/pdf" || aadhaarFile.name.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileIcon className="h-10 w-10 text-red-500" />
                        <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">{aadhaarFile.name}</span>
                      </div>
                    ) : (
                      <img src={URL.createObjectURL(aadhaarFile)} alt="Aadhaar" className="h-full w-full object-cover rounded-md" />
                    )
                  ) : formData.legalDocuments.aadhaarUrl ? (
                    formData.legalDocuments.aadhaarUrl.toLowerCase().endsWith(".pdf") ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileIcon className="h-10 w-10 text-red-500" />
                        <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">Aadhaar Document (PDF)</span>
                      </div>
                    ) : (
                      <img src={formData.legalDocuments.aadhaarUrl} alt="Aadhaar" className="h-full w-full object-cover rounded-md" />
                    )
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-md bg-white shadow-sm flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform"><Plus className="h-5 w-5" /></div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Upload Aadhaar</span>
                    </>
                  )}
                  {(aadhaarFile || formData.legalDocuments.aadhaarUrl) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAadhaarFile(null);
                        setFormData({ ...formData, legalDocuments: { ...formData.legalDocuments, aadhaarUrl: "" } });
                      }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      aria-label="Remove Aadhaar document"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <input id="setup-staff-aadhaar-upload" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
                </div>
              </div>

              {/* Passport Photo */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Passport Photo</label>
                  <div className="h-10 w-full" />
                </div>
                <div
                  className="h-56 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                  onClick={() => document.getElementById("setup-staff-passport-photo-upload")?.click()}
                >
                  {passportPhotoFile ? (
                    <img src={URL.createObjectURL(passportPhotoFile)} alt="Photo" className="h-full w-full object-cover rounded-md" />
                  ) : formData.legalDocuments.passportPhotoUrl ? (
                    <img src={formData.legalDocuments.passportPhotoUrl} alt="Photo" className="h-full w-full object-cover rounded-md" />
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-md bg-white shadow-sm flex items-center justify-center text-purple-500 group-hover:scale-105 transition-transform"><Plus className="h-5 w-5" /></div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Select Photo</span>
                    </>
                  )}
                  {(passportPhotoFile || formData.legalDocuments.passportPhotoUrl) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPassportPhotoFile(null);
                        setFormData({ ...formData, legalDocuments: { ...formData.legalDocuments, passportPhotoUrl: "" } });
                      }}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      aria-label="Remove passport photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <input id="setup-staff-passport-photo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => setPassportPhotoFile(e.target.files?.[0] || null)} />
                </div>
                <p className="text-[10px] text-slate-500 italic text-center px-4">Used for official ID cards.</p>
              </div>
            </div>
          </TabsContent>

          {/* Salesperson Profile — shown only when Is Salesperson is checked, mirrors
              HRMS's StaffFormPage.tsx "Salesperson Profile" tab field-for-field. */}
          <TabsContent
            value="salesperson"
            className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Salesperson Unique Code</label>
                <Input
                  placeholder="e.g. SP-001"
                  value={formData.salespersonCode}
                  onChange={(e) => setFormData({ ...formData, salespersonCode: e.target.value })}
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Salesperson Since</label>
                <Input
                  type="date"
                  value={formData.salespersonSince}
                  onChange={(e) => setFormData({ ...formData, salespersonSince: e.target.value })}
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Salesperson Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALES EXECUTIVE">SALES EXECUTIVE</SelectItem>
                    <SelectItem value="MANAGER">MANAGER</SelectItem>
                    <SelectItem value="SENIOR EXECUTIVE">SENIOR EXECUTIVE</SelectItem>
                    <SelectItem value="AREA MANAGER">AREA MANAGER</SelectItem>
                    <SelectItem value="DIRECTOR">DIRECTOR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Account Ledger Group</label>
                <Input
                  placeholder="e.g. Sales Ledger"
                  value={formData.accountGroup}
                  onChange={(e) => setFormData({ ...formData, accountGroup: e.target.value })}
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Incentive Ledger Account</label>
                <Input
                  placeholder="e.g. Sales Commission Expense"
                  value={formData.incentiveAccount}
                  onChange={(e) => setFormData({ ...formData, incentiveAccount: e.target.value })}
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Incentive Sharing %</label>
                <Input
                  type="number"
                  placeholder="Commission splitting share"
                  value={formData.incentiveSharingPercent}
                  onChange={(e) => setFormData({ ...formData, incentiveSharingPercent: parseFloat(e.target.value) || 0 })}
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Primary Incentive %</label>
                <Input
                  type="number"
                  placeholder="Direct commission earning share"
                  value={formData.primaryIncentivePercent}
                  onChange={(e) => setFormData({ ...formData, primaryIncentivePercent: parseFloat(e.target.value) || 0 })}
                  className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Direct Reporting Manager</label>
                <Select
                  value={formData.underManagerId || "none"}
                  onValueChange={(v) => setFormData({ ...formData, underManagerId: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm">
                    <SelectValue placeholder="Select Direct Reporting Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager (Top Level)</SelectItem>
                    {salespersonManagers
                      .filter((m: any) => (m.userId?._id || m.userId?.id || m.userId) !== id)
                      .map((m: any) => (
                        <SelectItem key={m._id} value={m._id || ""}>
                          {m.userId?.name || "Unknown"} ({m.salespersonCode})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-row items-center justify-between p-3 rounded-lg bg-white border border-slate-200 md:col-span-2">
                <div className="space-y-0.5">
                  <label className="text-[13px] font-semibold text-[#333333]">Is Manager Staff</label>
                  <p className="text-[10px] text-slate-500">Allows other sales executives to report under them</p>
                </div>
                <Checkbox
                  checked={formData.isSalespersonManager}
                  onCheckedChange={(v) => setFormData({ ...formData, isSalespersonManager: !!v })}
                  className="h-5 w-5 rounded border-slate-300"
                  disabled={fieldsDisabled}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1">Additional Remarks / Other Information</label>
                <textarea
                  placeholder="Enter any other operational details, incentive remarks or notes..."
                  rows={4}
                  value={formData.salespersonRemarks}
                  onChange={(e) => setFormData({ ...formData, salespersonRemarks: e.target.value })}
                  className="w-full rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm p-3 border"
                  disabled={fieldsDisabled}
                />
              </div>
            </div>
          </TabsContent>
          </>
          )}

          <TabsContent
            value="permissions"
            className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
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

            <TableContainer className="mt-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">
                      features
                    </TableHead>
                    <TableHead>
                      Capabilities
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FEATURES_CONFIG.map((feature) => (
                    <TableRow
                      key={feature.name}
                     
                    >
                      <TableCell>
                        <span className="font-semibold">{feature.name}</span>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabsContent>

          <TabsContent
            value="assigned-customers"
            className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Assign Specific Customers to this Staff Member
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Select the customers this staff member is responsible for. If &quot;Customers &gt; View (Own)&quot; is checked on the Permissions tab, this staff member will <strong>only see these selected customers</strong> when they log in.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers by company or contact name..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-9 h-10 border-slate-200"
                    disabled={fieldsDisabled}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">
                    Selected: <span className="text-primary font-bold">{selectedClientIds.length}</span> / {clients.length}
                  </span>
                  {filteredClients.length > 0 && !fieldsDisabled && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-9"
                      onClick={() => {
                        const allFilteredIds = filteredClients.map((c: any) => c._id);
                        const allSelected = allFilteredIds.every((id: string) => selectedClientIds.includes(id));
                        if (allSelected) {
                          setSelectedClientIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
                        } else {
                          setSelectedClientIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
                        }
                      }}
                    >
                      {filteredClients.every((c: any) => selectedClientIds.includes(c._id))
                        ? "Deselect All Filtered"
                        : "Select All Filtered"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {isLoadingClients ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading customers...
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No customers found.
                    </div>
                  ) : (
                    filteredClients.map((client: any) => {
                      const isSelected = selectedClientIds.includes(client._id);
                      return (
                        <label
                          key={client._id}
                          className={`flex items-center gap-3 p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleClientSelection(client._id)}
                            disabled={fieldsDisabled}
                            className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <p className="font-semibold text-foreground text-sm">{client.company}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.contact_person ? client.contact_person : "No contact person"}
                                {client.phonenumber ? ` • ${client.phonenumber}` : ""}
                                {client.email ? ` • ${client.email}` : ""}
                              </p>
                            </div>
                            {client.customer_reference && (
                              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono w-fit">
                                {client.customer_reference}
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          </div>
          </div>
        </Tabs>

        {/* ManageCompaniesDialog is an HRMS component and needs HRMS's ConfirmContext,
            which isn't mounted on the Setup side — provide it locally here. */}
        <ConfirmProvider>
          <ManageCompaniesDialog
            open={companiesDialogOpen}
            onOpenChange={setCompaniesDialogOpen}
            companies={managingCompanies}
            onChanged={() => {
              refetchManagingCompanies().then(({ data }) => {
                if (formData.managingCompanyId && data && !data.some((c) => (c._id || c.id) === formData.managingCompanyId)) {
                  setFormData((prev: any) => ({ ...prev, managingCompanyId: "" }));
                }
              });
            }}
          />
        </ConfirmProvider>
      </div>
    </DashboardLayout>
  );
}

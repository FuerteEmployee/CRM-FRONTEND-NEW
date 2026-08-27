import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CreditCard,
  FileText as FileIcon,
  Camera,
  Plus,
  Briefcase,
  UserCircle,
  MapPin,
  Zap,
  Info,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/hrms/components/ui/tabs";
import { staffService } from "@/hrms/services/staffService";
import { salespersonService } from "@/hrms/services/salespersonService";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { departmentService } from "@/hrms/services/departmentService";
import { designationService, type Designation } from "@/hrms/services/designationService";
import { shiftService, type Shift } from "@/hrms/services/shiftService";
import { managingCompanyService, type ManagingCompany } from "@/hrms/services/managingCompanyService";
import { ManageCompaniesDialog } from "@/hrms/components/staff/ManageCompaniesDialog";
import { toast } from "@/hrms/hooks/use-toast";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/hrms/components/ui/form";
import { ScrollArea } from "@/hrms/components/ui/scroll-area";
import { Checkbox } from "@/hrms/components/ui/checkbox";
import { cn } from "@/hrms/lib/utils";
import { API_BASE_URL } from "@/hrms/services/apiClient";

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = API_BASE_URL.replace(/\/api$/, "");
  const cleanPath = url.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
};

const staffSchema = z.object({
  // Identity
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().regex(/^\d{10}$/, "Invalid phone number (10 digits required)"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  avatar: z.string().optional(),

  // Personal
  gender: z.string().optional(),
  dob: z.string().optional(),
  bloodGroup: z.string().optional(),
  education: z.string().optional(),
  totalExperience: z.string().optional(),
  residentialPhone: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits").or(z.literal("")).optional(),
  address: z.object({
    current: z.string().optional(),
    permanent: z.string().optional(),
  }).optional(),

  // Emergency
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits").or(z.literal("")).optional(),
    relation: z.string().optional(),
  }).optional(),

  // Bank
  bankInfo: z.object({
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional().or(z.literal("")),
    bankName: z.string().optional(),
    branchCity: z.string().optional(),
  }).optional(),

  legalDocuments: z.object({
    panNumber: z.string().optional().or(z.literal("")),
    panUrl: z.string().optional(),
    aadhaarNumber: z.string().optional().or(z.literal("")),
    aadhaarUrl: z.string().optional(),
    passportPhotoUrl: z.string().optional(),
  }).optional(),

  // Employment
  role: z.string().optional(),
  hrmsBranchId: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.string().optional(),
  payType: z.string().optional(),
  salaryAmount: z.coerce.number().min(0, "Salary cannot be negative").default(0),
  salaryManagedBy: z.enum(["screen_time", "branch"]).default("screen_time"),
  // Nullable: screen_time-managed employees have no managing company, and the
  // backend returns null for them. Requiredness is enforced conditionally in
  // the superRefine below (only branch-managed employees need one).
  managingCompanyId: z.string().nullable().optional(),
  joiningDate: z.string().optional(),
  shiftId: z.string().optional(),
  designation: z.string().optional(),
  weeklyHolidays: z.array(z.string()).default([]),
  attendanceExceptions: z.array(z.string()).default([]),
  attendanceRequired: z.boolean().default(true),
  isSalesperson: z.boolean().default(false),
  salespersonCode: z.string().optional(),
  salespersonSince: z.string().optional(),
  accountGroup: z.string().optional(),
  category: z.string().optional(),
  incentiveAccount: z.string().optional(),
  incentiveSharingPercent: z.coerce.number().default(0),
  primaryIncentivePercent: z.coerce.number().default(0),
  isSalespersonManager: z.boolean().default(false),
  underManagerId: z.string().optional(),
  salespersonRemarks: z.string().optional(),

  // Salary Config
  salaryConfig: z.object({
    salaryTemplateId: z.string().optional(),
    tdsOnProfession: z.boolean().default(false),
    basic: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    hra: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    da: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    conveyanceAllowance: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    pf: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    esic: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    epf: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    retention: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    professionalTax: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    adminCharge: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
    bonus: z.object({
      value: z.coerce.number().min(0, "Value cannot be negative").default(0),
      type: z.enum(["amount", "percent"]).default("amount"),
      isIncluded: z.boolean().default(true),
    }).optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  // Managing company is required ONLY for branch-managed employees. For
  // screen_time-managed staff it stays empty/null and must not be demanded.
  if (data.salaryManagedBy === "branch" && !data.managingCompanyId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["managingCompanyId"],
      message: "Managing company is required for branch-managed employees",
    });
  }
});

type StaffFormValues = z.infer<typeof staffSchema>;

export default function StaffFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;
  useAuth();

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [managersList, setManagersList] = useState<any[]>([]);
  const [managingCompanies, setManagingCompanies] = useState<ManagingCompany[]>([]);
  const [companiesDialogOpen, setCompaniesDialogOpen] = useState(false);

  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [panPreview, setPanPreview] = useState<string>("");
  const [aadhaarPreview, setAadhaarPreview] = useState<string>("");
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      password: "",
      gender: "",
      dob: "",
      bloodGroup: "",
      education: "",
      totalExperience: "",
      residentialPhone: "",
      address: { current: "", permanent: "" },
      emergencyContact: { name: "", phone: "", relation: "" },
      bankInfo: { accountName: "", accountNumber: "", ifscCode: "", bankName: "", branchCity: "" },
      legalDocuments: { panNumber: "", panUrl: "", aadhaarNumber: "", aadhaarUrl: "", passportPhotoUrl: "" },
      role: "",
      hrmsBranchId: "",
      department: "",
      designation: "",
      employmentType: "permanent",
      payType: "Monthly",
      salaryAmount: 0,
      salaryManagedBy: "screen_time",
      joiningDate: new Date().toISOString().split('T')[0],
      shiftId: "",
      weeklyHolidays: [],
      attendanceExceptions: [],
      attendanceRequired: true,
      isSalesperson: false,
      salespersonCode: "",
      salespersonSince: new Date().toISOString().split('T')[0],
      accountGroup: "Sales Ledger",
      category: "SALES EXECUTIVE",
      incentiveAccount: "",
      incentiveSharingPercent: 0,
      primaryIncentivePercent: 0,
      isSalespersonManager: false,
      underManagerId: "",
      salespersonRemarks: "",
      salaryConfig: {
        salaryTemplateId: "",
        tdsOnProfession: false,
        basic: { value: 0, type: "amount", isIncluded: true },
        hra: { value: 0, type: "amount", isIncluded: true },
        da: { value: 0, type: "amount", isIncluded: true },
        conveyanceAllowance: { value: 0, type: "amount", isIncluded: true },
        pf: { value: 0, type: "amount", isIncluded: true },
        esic: { value: 0, type: "amount", isIncluded: true },
        epf: { value: 0, type: "amount", isIncluded: true },
        retention: { value: 0, type: "amount", isIncluded: true },
        professionalTax: { value: 0, type: "amount", isIncluded: true },
        adminCharge: { value: 0, type: "amount", isIncluded: true },
        bonus: { value: 0, type: "amount", isIncluded: true },
      }
    },
  });

  const labelClass = "text-[13px] font-semibold text-[#333333] tracking-wider mb-1.5 block ml-1";

  // Refresh the companies list after the manage-dialog changes it; clear the
  // form's selection if the selected company was deleted.
  const reloadCompanies = async () => {
    try {
      const list = await managingCompanyService.list();
      setManagingCompanies(list);
      const current = form.getValues("managingCompanyId");
      if (current && !list.some((c) => (c._id || c.id) === current)) {
        form.setValue("managingCompanyId", "");
      }
    } catch { /* list keeps its previous state */ }
  };

  const fmt12 = (t: string) => {
    if (!t) return t;
    const [h, m] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
  };
  const inputClass = "h-10 rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm";

  // Manage Preview URLs
  useEffect(() => {
    const files = [
      { file: panFile, setter: setPanPreview },
      { file: aadhaarFile, setter: setAadhaarPreview },
      { file: passportPhotoFile, setter: setPassportPhotoPreview },
      { file: avatarFile, setter: setAvatarPreview }
    ];
    const cleanups: (() => void)[] = [];
    files.forEach(({ file, setter }) => {
      if (file) {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          setter(url);
          cleanups.push(() => URL.revokeObjectURL(url));
        } else if (file.type === 'application/pdf') {
          setter("PDF_SELECTED");
        } else {
          setter("");
        }
      } else {
        setter("");
      }
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, [panFile, aadhaarFile, passportPhotoFile, avatarFile]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [branchesData, deptsData, desigsData, shiftsData, spList, companiesData] = await Promise.all([
          hrmsbranchService.getAll(),
          departmentService.getAll(),
          designationService.getAll(),
          shiftService.getAll(),
          salespersonService.getAll().catch(() => []),
          managingCompanyService.list()
        ]);
        setBranches(branchesData.data || []);
        setDepartments(deptsData);
        setDesignations(desigsData);
        setShifts(shiftsData);
        setManagersList(spList.filter(s => s.isManager));
        setManagingCompanies(companiesData);

        if (isEdit) {
          // Sanitize ID in case it comes with a colon prefix (e.g. from some legacy links)
          const cleanId = (id as string).startsWith(":") ? (id as string).substring(1) : id;
          const user = await staffService.getById(cleanId as string);
          
          let salespersonProfile: any = null;
          try {
            salespersonProfile = await salespersonService.getByUserId(cleanId as string);
          } catch (e) {
            console.log("No salesperson profile exists yet");
          }

          if (user) {
            form.reset({
              ...user,
              mobile: String(user.mobile || ""),
              dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
              joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : "",
              gender: typeof user.gender === "string" ? user.gender : "",
              role: (user.role && typeof user.role === "object") ? ((user.role as any)._id || (user.role as any).id) : (user.role as string || ""),
              hrmsBranchId: ((user as any).hrmsBranchId && typeof (user as any).hrmsBranchId === "object")
                ? ((user as any).hrmsBranchId._id || (user as any).hrmsBranchId.id || "")
                : ((user as any).hrmsBranchId as string || ""),
              department: (user.department && typeof user.department === "object") ? ((user.department as any)._id || (user.department as any).id) : (user.department as string || ""),
              designation: (user.designation && typeof user.designation === "object") ? ((user.designation as any)._id || (user.designation as any).id) : (user.designation as string || ""),
              shiftId: (user.shiftId && typeof user.shiftId === "object") ? ((user.shiftId as any)._id || (user.shiftId as any).id) : (user.shiftId as string || ""),
              // Normalize to a plain id string ("" when unset) — the backend may
              // return this populated (object) or null; the select needs a string.
              managingCompanyId: ((user as any).managingCompanyId && typeof (user as any).managingCompanyId === "object")
                ? ((user as any).managingCompanyId._id || (user as any).managingCompanyId.id || "")
                : ((user as any).managingCompanyId as string || ""),

              salaryManagedBy: (user as any).salaryManagedBy || "screen_time",
              isSalesperson: !!(user as any).isSalesperson,
              salespersonCode: salespersonProfile?.salespersonCode || "",
              salespersonSince: salespersonProfile?.salespersonSince ? new Date(salespersonProfile.salespersonSince).toISOString().split('T')[0] : "",
              accountGroup: salespersonProfile?.accountGroup || "Sales Ledger",
              category: salespersonProfile?.category || "SALES EXECUTIVE",
              incentiveAccount: salespersonProfile?.incentiveAccount || "",
              incentiveSharingPercent: salespersonProfile?.incentiveSharingPercent || 0,
              primaryIncentivePercent: salespersonProfile?.primaryIncentivePercent || 0,
              isSalespersonManager: !!salespersonProfile?.isManager,
              underManagerId: salespersonProfile?.underManagerId?._id || salespersonProfile?.underManagerId || "",
              salespersonRemarks: salespersonProfile?.otherInfo || "",

              // Ensure arrays are always arrays
              weeklyHolidays: Array.isArray(user.weeklyHolidays) ? user.weeklyHolidays : [],
              attendanceExceptions: Array.isArray(user.attendanceExceptions) ? user.attendanceExceptions : [],

              // Ensure objects have structure to satisfy Zod
              address: {
                current: user.address?.current || "",
                permanent: user.address?.permanent || "",
              },
              emergencyContact: {
                name: user.emergencyContact?.name || "",
                phone: user.emergencyContact?.phone || "",
                relation: user.emergencyContact?.relation || "",
              },
              bankInfo: {
                accountName: user.bankInfo?.accountName || "",
                accountNumber: user.bankInfo?.accountNumber || "",
                ifscCode: user.bankInfo?.ifscCode || "",
                bankName: user.bankInfo?.bankName || "",
                branchCity: user.bankInfo?.branchCity || "",
              },
              legalDocuments: {
                panNumber: user.legalDocuments?.panNumber || "",
                panUrl: user.legalDocuments?.panUrl || "",
                aadhaarNumber: user.legalDocuments?.aadhaarNumber || "",
                aadhaarUrl: user.legalDocuments?.aadhaarUrl || "",
                passportPhotoUrl: user.legalDocuments?.passportPhotoUrl || "",
              },

              salaryConfig: {
                ...user.salaryConfig,
                salaryTemplateId: (user.salaryConfig?.salaryTemplateId && typeof user.salaryConfig?.salaryTemplateId === "object")
                  ? ((user.salaryConfig.salaryTemplateId as any)._id || (user.salaryConfig.salaryTemplateId as any).id)
                  : (user.salaryConfig?.salaryTemplateId as string || ""),
                basic: user.salaryConfig?.basic || { value: 0, type: "amount", isIncluded: true },
                hra: user.salaryConfig?.hra || { value: 0, type: "amount", isIncluded: true },
                da: user.salaryConfig?.da || { value: 0, type: "amount", isIncluded: true },
                conveyanceAllowance: user.salaryConfig?.conveyanceAllowance || { value: 0, type: "amount", isIncluded: true },
                pf: user.salaryConfig?.pf || { value: 0, type: "amount", isIncluded: true },
                esic: user.salaryConfig?.esic || { value: 0, type: "amount", isIncluded: true },
                epf: user.salaryConfig?.epf || { value: 0, type: "amount", isIncluded: true },
                retention: user.salaryConfig?.retention || { value: 0, type: "amount", isIncluded: true },
                professionalTax: user.salaryConfig?.professionalTax || { value: 0, type: "amount", isIncluded: true },
                adminCharge: user.salaryConfig?.adminCharge || { value: 0, type: "amount", isIncluded: true },
                bonus: user.salaryConfig?.bonus || { value: 0, type: "amount", isIncluded: true },
              }
            });
          }
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit, form]);

  const onFormSubmit = async (values: StaffFormValues) => {
    if (!isEdit && (!values.password || values.password.trim() === "")) {
      form.setError("password", { type: "manual", message: "Password is required for new accounts" });
      toast({ title: "Validation Error", description: "Password is required for new accounts", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      const appendToFormData = (data: any, rootKey?: string) => {
        Object.keys(data).forEach(key => {
          const value = data[key];
          const fullKey = rootKey ? `${rootKey}.${key}` : key;
          const idFields = ["role", "hrmsBranchId", "department", "designation", "shiftId", "salaryTemplateId", "managingCompanyId"];
          if (idFields.includes(key) && (value === "" || value === "none" || value === "__none__" || value === null || value === undefined)) {
            formData.append(fullKey, "null");
            return;
          }
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof File)) {
            appendToFormData(value, fullKey);
          } else if (value !== undefined && value !== null) {
            if (fullKey === "password" && !value && isEdit) return;
            if ((fullKey === "dob" || fullKey === "joiningDate") && value === "") return;
            let finalValue = value;
            if (typeof value === "number" && isNaN(value)) finalValue = 0;
            if (Array.isArray(finalValue)) {
              finalValue.forEach(v => formData.append(fullKey, v));
            } else {
              formData.append(fullKey, finalValue instanceof Date ? finalValue.toISOString() : finalValue);
            }
          }
        });
      };
      appendToFormData(values);
      if (panFile) formData.append("pan", panFile);
      if (aadhaarFile) formData.append("aadhaar", aadhaarFile);
      if (passportPhotoFile) formData.append("passportPhoto", passportPhotoFile);
      if (avatarFile) formData.append("avatar", avatarFile);

      const cleanId = (id as string)?.startsWith(":") ? (id as string).substring(1) : id;

      let savedUser: any;
      if (isEdit) {
        savedUser = await staffService.update(cleanId as string, formData as any);
        toast({ title: "Success", description: "Staff profile updated" });
      } else {
        savedUser = await staffService.create(formData as any);
        toast({ title: "Success", description: "Staff account created" });
      }

      if (savedUser) {
        const userId = savedUser.id || savedUser._id;
        if (values.isSalesperson) {
          const salespersonPayload = {
            userId: userId,
            salespersonCode: values.salespersonCode || `SP-${(savedUser.name || "USER").split(" ").map((n: string) => n[0]).join("").toUpperCase()}-${Date.now().toString().slice(-4)}`,
            salespersonSince: values.salespersonSince || new Date().toISOString().split('T')[0],
            accountGroup: values.accountGroup || "Sales Ledger",
            category: values.category || "SALES EXECUTIVE",
            departmentId: values.department || null,
            designationId: values.designation || null,
            incentiveAccount: values.incentiveAccount || "",
            incentiveSharingPercent: Number(values.incentiveSharingPercent || 0),
            primaryIncentivePercent: Number(values.primaryIncentivePercent || 0),
            panNumber: values.legalDocuments?.panNumber || "",
            panStatus: "Pending",
            branchId: (values as any).hrmsBranchId || null,
            isManager: !!values.isSalespersonManager,
            underManagerId: values.underManagerId === "none" || !values.underManagerId ? null : values.underManagerId,
            addressLine1: values.address?.current || "",
            addressLine2: values.address?.permanent || "",
            state: "",
            city: "",
            pincode: "",
            mobile: values.mobile || "",
            phone: values.residentialPhone || "",
            email: values.email || "",
            aadharNo: values.legalDocuments?.aadhaarNumber || "",
            otherInfo: values.salespersonRemarks || "",
            isActive: true
          };

          let existingSp: any = null;
          try {
            existingSp = await salespersonService.getByUserId(userId);
          } catch (e) {
            console.log("No salesperson profile exists yet");
          }

          try {
            if (existingSp) {
              await salespersonService.update(existingSp._id, salespersonPayload);
              toast({ title: "Synced", description: "Salesperson Master profile updated in sync" });
            } else {
              await salespersonService.create(salespersonPayload);
              toast({ title: "Created", description: "Salesperson Master profile created automatically" });
            }
          } catch (spError) {
             console.warn("Salesperson sync failed", spError);
             toast({ title: "Staff Saved", description: "Staff saved, but salesperson sync is not available yet.", variant: "default" });
          }
        } else {
          // If isSalesperson is false, remove/delete any existing salesperson profile automatically
          let existingSp: any = null;
          try {
            existingSp = await salespersonService.getByUserId(userId);
          } catch (e) {}
          try {
            if (existingSp) {
              await salespersonService.delete(existingSp._id);
              toast({ title: "Updated", description: "Salesperson Master profile removed successfully" });
            }
          } catch (spError) {
             console.warn("Salesperson sync failed", spError);
          }
        }
      }
      const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
      navigate(`${basePath}/staff/users`);
    } catch (error: any) {
      const msg: string =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save staff profile";
      // Set field-level error so the message appears under the field in the form
      if (/phone|mobile/i.test(msg)) {
        form.setError("mobile", { type: "manual", message: msg });
      } else if (/email/i.test(msg)) {
        form.setError("email", { type: "manual", message: msg });
      }
      toast({ title: "Save Failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20 bg-white min-h-screen">
      <div className="flex items-center justify-between border-b-[0.8px] border-slate-200 pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => {
            const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
            navigate(`${basePath}/staff/users`);
          }} className="rounded-full hover:bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-[#1a1a1a]">
            {isEdit ? "Edit Staff Member" : "New Staff Member"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => {
            const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
            navigate(`${basePath}/staff/users`);
          }} className="h-9 px-5 text-slate-600 font-medium">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={form.handleSubmit(onFormSubmit, (err) => {
              console.error("Form Validation Errors:", err);
              const firstKey = Object.keys(err)[0] as keyof typeof err;
              const firstError = err[firstKey];
              let msg = "Check form errors";
              if (firstError?.message) msg = `${firstKey}: ${firstError.message}`;
              else if (firstError && typeof firstError === 'object') {
                const subKey = Object.keys(firstError)[0];
                msg = `${firstKey}.${subKey} is invalid`;
              }
              toast({ title: "Validation Error", description: msg, variant: "destructive" });
            })}
            className="gradient-primary text-white border-0 rounded-md h-9 px-6 font-medium shadow-sm flex items-center gap-2"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Update Profile" : "Save Staff"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-8">
          <Tabs defaultValue="identity" className="w-full">
            <TabsList className="h-10 bg-transparent p-0 gap-6 border-b border-slate-300 w-full justify-start rounded-none mb-6 overflow-x-auto">
              <TabsTrigger value="identity" className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap">Identity & Personal</TabsTrigger>
              <TabsTrigger value="employment" className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap">Employment Details</TabsTrigger>
              <TabsTrigger value="salary" className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap">Salary & Banking</TabsTrigger>
              <TabsTrigger value="documents" className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap">Legal Documents</TabsTrigger>
              {form.watch("isSalesperson") && (
                <TabsTrigger value="salesperson" className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-semibold text-xs tracking-wider px-1 transition-all whitespace-nowrap">Salesperson Profile</TabsTrigger>
              )}
            </TabsList>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-h-[600px]">
              <ScrollArea className="h-full">
                <div className="p-10">
                  {/* Identity & Personal */}
                  <TabsContent value="identity" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row gap-10">
                      <div className="w-full md:w-1/3 flex flex-col items-center gap-6">
                        <div className="relative group">
                          <div className="h-40 w-40 rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center group">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : form.watch("avatar") ? (
                              <img src={getFileUrl(form.watch("avatar"))} alt="Avatar" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-slate-300">
                                <UserCircle className="h-16 w-16" />
                                <span className="text-[10px] font-semibold uppercase tracking-widest">No Photo</span>
                              </div>
                            )}
                            <div
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer backdrop-blur-[1px]"
                              onClick={() => document.getElementById('avatar-upload')?.click()}
                            >
                              <Camera className="h-6 w-6 text-white mb-1" />
                              <span className="text-[9px] font-semibold text-white uppercase tracking-widest">Update</span>
                            </div>
                          </div>
                          <input
                            id="avatar-upload"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                          />
                        </div>
                        <div className="text-center space-y-1">
                          <h3 className="text-base font-semibold text-[#1a1a1a]">Profile Picture</h3>
                          <p className="text-[11px] text-slate-500 font-medium">JPG, PNG or WEBP. Max 2MB.</p>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Full Name <span className="text-destructive ml-1">*</span></FormLabel>
                            <FormControl><Input placeholder="John Doe" className={inputClass} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Email Address <span className="text-destructive ml-1">*</span></FormLabel>
                            <FormControl><Input placeholder="john@example.com" autoComplete="off" className={inputClass} disabled={isEdit} {...field} /></FormControl>
                            {isEdit && <FormDescription className="text-[11px] text-slate-400 ml-1">Email cannot be changed after account creation.</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="mobile" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Mobile Number <span className="text-destructive ml-1">*</span></FormLabel>
                            <FormControl><Input placeholder="9876543210" inputMode="numeric" maxLength={10} className={inputClass} {...field} onChange={e => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>
                              {isEdit ? "New Password" : "Account Password"}
                              {!isEdit && <span className="text-destructive ml-1">*</span>}
                            </FormLabel>
                            <FormControl><Input type="password" placeholder="••••••••" autoComplete="new-password" className={inputClass} {...field} /></FormControl>
                            {isEdit && <FormDescription className="text-[11px] text-slate-400 ml-1">Leave blank to keep the current password.</FormDescription>}
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Gender</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select Gender" /></SelectTrigger></FormControl>
                              <SelectContent className="rounded-md"><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="dob" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Date of Birth</FormLabel>
                            <FormControl><Input type="date" className={inputClass} {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField control={form.control} name="bloodGroup" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Blood Group</FormLabel>
                          <FormControl><Input placeholder="e.g. O+" className={inputClass} {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="education" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Education</FormLabel>
                          <FormControl><Input placeholder="e.g. MBA, B.Tech" className={inputClass} {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="totalExperience" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Experience</FormLabel>
                          <FormControl><Input placeholder="e.g. 5 Years" className={inputClass} {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="residentialPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Residential Phone</FormLabel>
                          <FormControl><Input placeholder="10 digit number" inputMode="numeric" maxLength={10} className={inputClass} {...field} onChange={e => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" /> Emergency Contact
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="emergencyContact.name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Contact Name</FormLabel>
                            <FormControl><Input placeholder="Full Name" className={inputClass} {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="emergencyContact.phone" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Contact Phone</FormLabel>
                            <FormControl><Input placeholder="10 digit number" inputMode="numeric" maxLength={10} className={inputClass} {...field} onChange={e => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 10))} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="emergencyContact.relation" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Relation</FormLabel>
                            <FormControl><Input placeholder="e.g. Spouse" className={inputClass} {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> Residential Address
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="address.current" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Current Address</FormLabel>
                            <FormControl><Input placeholder="Full residential address" className={inputClass} {...field} /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="address.permanent" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Permanent Address</FormLabel>
                            <FormControl><Input placeholder="As per documents" className={inputClass} {...field} /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Employment Details */}
                  <TabsContent value="employment" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                      <FormField control={form.control} name={"hrmsBranchId" as any} render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Branch</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select Branch" /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-md">
                              <SelectItem value="__none__">*None</SelectItem>
                              {branches.map(s => <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="department" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select Department" /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-md">
                              {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="designation" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Designation</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select Designation" /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-md">
                              {designations.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="shiftId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Work Shift</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Select Shift" /></SelectTrigger></FormControl>
                            <SelectContent className="rounded-md">
                              <SelectItem value="__none__">*None</SelectItem>
                              {shifts.map(s => (
                                <SelectItem key={s._id} value={s._id}>
                                  {s.name} &nbsp;·&nbsp; {fmt12(s.startTime)} – {fmt12(s.endTime)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="joiningDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Joining Date</FormLabel>
                          <FormControl><Input type="date" className={inputClass} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>


                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                          <Zap className="h-5 w-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-[#1a1a1a]">Employment Options</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="employmentType" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Employment Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                              <SelectContent className="rounded-md">
                                <SelectItem value="permanent">Permanent</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="intern">Intern</SelectItem>
                                <SelectItem value="probation">Probation</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="attendanceRequired" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg bg-white border border-slate-200 mt-5">
                            <div className="space-y-0.5">
                              <FormLabel className="text-[13px] font-semibold text-[#333333]">Attendance Tracking</FormLabel>
                              <FormDescription className="text-[10px] text-slate-500">Require biometrics/check-in</FormDescription>
                            </div>
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 rounded border-slate-300" /></FormControl>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="isSalesperson" render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
                            <div className="space-y-0.5">
                              <FormLabel className="text-[13px] font-semibold text-[#333333]">Is Salesperson</FormLabel>
                              <FormDescription className="text-[10px] text-slate-500">Can be assigned to sales vouchers & invoices</FormDescription>
                            </div>
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 rounded border-slate-300" /></FormControl>
                          </FormItem>
                        )} />
                      </div>


                      <div className="space-y-3">
                        <Label className={labelClass}>Weekly Holidays</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                            <FormField
                              key={day}
                              control={form.control}
                              name="weeklyHolidays"
                              render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0 p-2 rounded-md border border-slate-100 bg-white">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        field.onChange(checked ? [...current, day] : current.filter(d => d !== day));
                                      }}
                                    />
                                  </FormControl>
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{day.slice(0, 3)}</span>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Salary & Banking */}
                  <TabsContent value="salary" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-8 w-8 rounded-lg gradient-primary text-white flex items-center justify-center shadow-sm">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <h3 className="text-base font-semibold text-[#1a1a1a]">Bank Account Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="bankInfo.bankName" render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>Bank Name</FormLabel>
                              <FormControl><Input placeholder="e.g. HDFC Bank" className={inputClass} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="bankInfo.ifscCode" render={({ field }) => (
                            <FormItem>
                              <FormLabel className={labelClass}>IFSC Code</FormLabel>
                              <FormControl><Input placeholder="HDFC0001234" className={`${inputClass} uppercase`} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="bankInfo.accountNumber" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className={labelClass}>Account Number</FormLabel>
                              <FormControl><Input placeholder="Enter full account number" className={inputClass} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="bankInfo.accountName" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className={labelClass}>Beneficiary Name</FormLabel>
                              <FormControl><Input placeholder="Name on account" className={inputClass} {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
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
                            <p className="text-xl font-bold text-emerald-600">₹{form.watch("salaryAmount")?.toLocaleString("en-IN") || "0"}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="payType" render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelClass}>Pay Cycle</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Pay Type" /></SelectTrigger></FormControl>
                                  <SelectContent className="rounded-md"><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Hourly">Hourly</SelectItem></SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="salaryAmount" render={({ field }) => (
                              <FormItem>
                                <FormLabel className={labelClass}>Base Salary (₹)</FormLabel>
                                <FormControl><Input type="number" className={inputClass} {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                          </div>

                          <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-6">
                            <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-2"><Info className="h-3.5 w-3.5 text-primary" /> Salary Breakdown</h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="salaryConfig.basic.value"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase">Basic Salary</FormLabel>
                                    <FormControl>
                                      <Input type="number" className={inputClass} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="salaryConfig.hra.value"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase">HRA</FormLabel>
                                    <FormControl>
                                      <Input type="number" className={inputClass} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="salaryConfig.pf.value"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase">PF (Employee)</FormLabel>
                                    <FormControl>
                                      <Input type="number" className={inputClass} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="salaryConfig.esic.value"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase">ESIC</FormLabel>
                                    <FormControl>
                                      <Input type="number" className={inputClass} {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Legal Documents */}
                  <TabsContent value="documents" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {/* PAN Card */}
                      <div className="space-y-4">
                        <FormField control={form.control} name="legalDocuments.panNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>PAN Number</FormLabel>
                            <FormControl><Input placeholder="ABCDE1234F" className={`${inputClass} uppercase`} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div
                          className="h-56 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                          onClick={() => document.getElementById('pan-upload')?.click()}
                        >
                          {panFile ? (
                            panFile.type === 'application/pdf' || panFile.name.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex flex-col items-center gap-2">
                                <FileIcon className="h-10 w-10 text-red-500" />
                                <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">{panFile.name}</span>
                              </div>
                            ) : (
                              <img src={panPreview} alt="PAN" className="h-full w-full object-cover rounded-md" />
                            )
                          ) : form.watch("legalDocuments.panUrl") ? (
                            form.watch("legalDocuments.panUrl")?.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex flex-col items-center gap-2">
                                <FileIcon className="h-10 w-10 text-red-500" />
                                <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">PAN Document (PDF)</span>
                              </div>
                            ) : (
                              <img src={getFileUrl(form.watch("legalDocuments.panUrl"))} alt="PAN" className="h-full w-full object-cover rounded-md" />
                            )
                          ) : (
                            <>
                              <div className="h-10 w-10 rounded-md bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-105 transition-transform"><Plus className="h-5 w-5" /></div>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Upload PAN</span>
                            </>
                          )}
                          {(panFile || form.watch("legalDocuments.panUrl")) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPanFile(null);
                                setPanPreview("");
                                form.setValue("legalDocuments.panUrl", "");
                              }}
                              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                              aria-label="Remove PAN document"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <input id="pan-upload" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                        </div>
                      </div>

                      {/* Aadhaar Card */}
                      <div className="space-y-4">
                        <FormField control={form.control} name="legalDocuments.aadhaarNumber" render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelClass}>Aadhaar Number</FormLabel>
                            <FormControl><Input placeholder="1234 5678 9012" className={inputClass} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div
                          className="h-56 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                          onClick={() => document.getElementById('aadhaar-upload')?.click()}
                        >
                          {aadhaarFile ? (
                            aadhaarFile.type === 'application/pdf' || aadhaarFile.name.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex flex-col items-center gap-2">
                                <FileIcon className="h-10 w-10 text-red-500" />
                                <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">{aadhaarFile.name}</span>
                              </div>
                            ) : (
                              <img src={aadhaarPreview} alt="Aadhaar" className="h-full w-full object-cover rounded-md" />
                            )
                          ) : form.watch("legalDocuments.aadhaarUrl") ? (
                            form.watch("legalDocuments.aadhaarUrl")?.toLowerCase().endsWith('.pdf') ? (
                              <div className="flex flex-col items-center gap-2">
                                <FileIcon className="h-10 w-10 text-red-500" />
                                <span className="text-[10px] font-bold text-slate-600 px-4 text-center truncate w-full">Aadhaar Document (PDF)</span>
                              </div>
                            ) : (
                              <img src={getFileUrl(form.watch("legalDocuments.aadhaarUrl"))} alt="Aadhaar" className="h-full w-full object-cover rounded-md" />
                            )
                          ) : (
                            <>
                              <div className="h-10 w-10 rounded-md bg-white shadow-sm flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform"><Plus className="h-5 w-5" /></div>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Upload Aadhaar</span>
                            </>
                          )}
                          {(aadhaarFile || form.watch("legalDocuments.aadhaarUrl")) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAadhaarFile(null);
                                setAadhaarPreview("");
                                form.setValue("legalDocuments.aadhaarUrl", "");
                              }}
                              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                              aria-label="Remove Aadhaar document"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <input id="aadhaar-upload" type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} />
                        </div>
                      </div>

                      {/* Passport Photo */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className={labelClass}>Passport Photo</Label>
                          <div className="h-10 w-full" />
                        </div>
                        <div
                          className="h-56 rounded-md border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                        >
                          {passportPhotoFile ? (
                            <img src={passportPhotoPreview} alt="Photo" className="h-full w-full object-cover rounded-md" />
                          ) : form.watch("legalDocuments.passportPhotoUrl") ? (
                            <img src={getFileUrl(form.watch("legalDocuments.passportPhotoUrl"))} alt="Photo" className="h-full w-full object-cover rounded-md" />
                          ) : (
                            <>
                              <div className="h-10 w-10 rounded-md bg-white shadow-sm flex items-center justify-center text-purple-500 group-hover:scale-105 transition-transform"><Plus className="h-5 w-5" /></div>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Select Photo</span>
                            </>
                          )}
                          {(passportPhotoFile || form.watch("legalDocuments.passportPhotoUrl")) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPassportPhotoFile(null);
                                setPassportPhotoPreview("");
                                form.setValue("legalDocuments.passportPhotoUrl", "");
                              }}
                              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                              aria-label="Remove passport photo"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={(e) => setPassportPhotoFile(e.target.files?.[0] || null)} />
                        </div>
                        <p className="text-[10px] text-slate-500 italic text-center px-4">Used for official ID cards.</p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Salesperson Profile */}
                  <TabsContent value="salesperson" className="m-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Unique Code */}
                      <FormField control={form.control} name="salespersonCode" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Salesperson Unique Code *</FormLabel>
                          <FormControl><Input placeholder="e.g. SP-001" className={inputClass} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Since */}
                      <FormField control={form.control} name="salespersonSince" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Salesperson Since</FormLabel>
                          <FormControl><Input type="date" className={inputClass} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Category */}
                      <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Salesperson Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={inputClass}>
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white border-slate-200">
                              <SelectItem value="SALES EXECUTIVE">SALES EXECUTIVE</SelectItem>
                              <SelectItem value="MANAGER">MANAGER</SelectItem>
                              <SelectItem value="SENIOR EXECUTIVE">SENIOR EXECUTIVE</SelectItem>
                              <SelectItem value="AREA MANAGER">AREA MANAGER</SelectItem>
                              <SelectItem value="DIRECTOR">DIRECTOR</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Account Ledger Group */}
                      <FormField control={form.control} name="accountGroup" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Account Ledger Group</FormLabel>
                          <FormControl><Input placeholder="e.g. Sales Ledger" className={inputClass} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Incentive Ledger Account */}
                      <FormField control={form.control} name="incentiveAccount" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Incentive Ledger Account</FormLabel>
                          <FormControl><Input placeholder="e.g. Sales Commission Expense" className={inputClass} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Incentive Sharing % */}
                      <FormField control={form.control} name="incentiveSharingPercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Incentive Sharing %</FormLabel>
                          <FormControl><Input type="number" placeholder="Commission splitting share" className={inputClass} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Primary Incentive % */}
                      <FormField control={form.control} name="primaryIncentivePercent" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Primary Incentive %</FormLabel>
                          <FormControl><Input type="number" placeholder="Direct commission earning share" className={inputClass} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {/* Under Manager */}
                      <FormField control={form.control} name="underManagerId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClass}>Direct Reporting Manager</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger className={inputClass}>
                                <SelectValue placeholder="Select Direct Reporting Manager" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white border-slate-200">
                              <SelectItem value="none">No Manager (Top Level)</SelectItem>
                              {managersList
                                .filter(m => m.userId?._id !== id && m.userId?.id !== id) // Prevent self-referencing
                                .map(m => (
                                  <SelectItem key={m._id} value={m._id || ""}>
                                    {m.userId?.name || "Unknown"} ({m.salespersonCode})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      {/* Is Manager Staff */}
                      <FormField control={form.control} name="isSalespersonManager" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-3 rounded-lg bg-white border border-slate-200 col-span-2">
                          <div className="space-y-0.5">
                            <FormLabel className="text-[13px] font-semibold text-[#333333]">Is Manager Staff</FormLabel>
                            <FormDescription className="text-[10px] text-slate-500">Allows other sales executives to report under them</FormDescription>
                          </div>
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 rounded border-slate-300" /></FormControl>
                        </FormItem>
                      )} />

                      {/* Remarks */}
                      <FormField control={form.control} name="salespersonRemarks" render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className={labelClass}>Additional Remarks / Other Information</FormLabel>
                          <FormControl>
                            <textarea
                              placeholder="Enter any other operational details, incentive remarks or notes..."
                              rows={4}
                              className="w-full rounded-md border-slate-300 bg-white text-[#333333] focus:ring-0 placeholder:text-slate-400 text-sm p-3 border"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}

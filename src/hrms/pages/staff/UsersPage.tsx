import { useEffect, useState, useMemo } from "react";
import { useDebounce } from "@/hrms/hooks/use-debounce";
import * as XLSX from "xlsx";
import { Badge } from "@/hrms/components/ui/badge";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { DataTable } from "@/hrms/components/common/DataTable";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import {
  Mail,
  Phone,
  Plus,
  Search,
  Users,
  Filter,
  Eye,
  Check,
  Info,
  Shield,
  ArrowUpDown,
  Building2,
  Import,
  Download,
  FileSpreadsheet,
  FileText as FileIcon,
  Camera,
  Calendar,
  MapPin,
  CreditCard,
  Banknote,
  Zap,
  Edit2,
  Trash2,
  X
} from "lucide-react";
import { staffService, type BulkResult } from "@/hrms/services/staffService";
import { Checkbox } from "@/hrms/components/ui/checkbox";
import { BulkEditStaffDialog } from "@/hrms/components/staff/BulkEditStaffDialog";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { roleService } from "@/hrms/services/roleService";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { departmentService } from "@/hrms/services/departmentService";
import { designationService, type Designation } from "@/hrms/services/designationService";
import { shiftService, type Shift } from "@/hrms/services/shiftService";
import { API_BASE_URL } from "@/hrms/services/apiClient";
import { useNavigate, useLocation } from "react-router-dom";
import { usePermission } from "@/hrms/hooks/usePermission";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { toast } from "@/hrms/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/hrms/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/hrms/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/hrms/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Label } from "@/hrms/components/ui/label";
import { RoleDefinition, User, Store as StoreType } from "@/hrms/types";
import { cn } from "@/hrms/lib/utils";
import { ScrollArea } from "@/hrms/components/ui/scroll-area";

// Other column names commonly used in company payroll / employee-master sheets,
// so the import's column mapping is filled in automatically (matched ignoring
// case, spaces and punctuation — "D.O.B" = "dob", "A/C No." = "acno").
const FIELD_ALIASES: Record<string, string[]> = {
  employeeCode: ["Emp Code", "Emp ID", "Employee ID", "Emp No", "Employee No", "Staff ID", "Code", "ID No"],
  name: ["Name", "Emp Name", "Staff Name", "Name of Employee", "Employee Full Name"],
  email: ["Email ID", "E-mail", "Mail ID", "Email Address", "Mail"],
  mobile: ["Mobile", "Mobile Number", "Phone", "Phone No", "Contact", "Contact No", "Contact Number", "Mob No", "Cell No"],
  gender: ["Sex", "M/F"],
  department: ["Dept", "Department Name", "Dept Name"],
  designation: ["Post", "Position", "Designation Name", "Job Title"],
  hrmsBranchId: ["Branch Name", "Location", "Site", "Work Location", "Office"],
  shiftId: ["Shift Name", "Shift Timing", "Shift Time"],
  employmentType: ["Emp Type", "Employee Type", "Type of Employment", "Employment"],
  payType: ["Pay Type", "Pay Cycle", "Payment Type", "Salary Type"],
  salaryAmount: ["Gross Salary", "Gross", "CTC", "Monthly Salary", "Fixed Salary", "Total Salary", "Salary/CTC", "Monthly CTC"],
  basic: ["Basic Salary", "Basic Pay"],
  hra: ["House Rent Allowance"],
  pfApplicable: ["PF Applicable", "PF (Y/N)", "PF Yes/No", "PF Y/N"],
  pfMode: ["PF Type", "PF Calculation"],
  pfRate: ["PF Interest Rate", "PF Rate", "PF %", "PF Percentage", "PF Rate %"],
  pfAmount: ["PF", "PF Deduction", "Employee PF", "PF (Employee)", "EPF"],
  esicAmount: ["ESIC", "ESI", "ESIC Deduction"],
  joiningDate: ["DOJ", "Joining Date", "Date of Join"],
  dob: ["DOB", "Birth Date", "Birthday"],
  bankName: ["Bank"],
  accountName: ["Account Holder", "Account Name", "Beneficiary Name", "Name as per Bank"],
  accountNumber: ["Account Number", "A/C No", "A/C Number", "Bank Account No", "Bank A/C No", "Account No."],
  ifscCode: ["IFSC", "IFSC No"],
  branchCity: ["Bank Branch Name", "Bank City"],
  currentAddress: ["Address", "Present Address", "Local Address", "Residential Address"],
  permanentAddress: ["Native Address", "Permanent Add"],
  panNumber: ["PAN", "PAN No", "PAN Card", "PAN Card No", "PAN Card Number"],
  aadhaarNumber: ["Aadhaar", "Aadhar", "Aadhar No", "Aadhaar No", "Aadhar Card No", "Aadhaar Card No", "Aadhar Number", "Aadhaar Card Number", "UID", "UID No"],
  emergencyName: ["Emergency Contact", "Emergency Name"],
  emergencyPhone: ["Emergency No", "Emergency Phone", "Emergency Contact No", "Emergency Number"],
  emergencyRelation: ["Relation", "Emergency Relation", "Relationship"],
};

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = API_BASE_URL.replace(/\/api$/, "");
  const cleanPath = url.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
};

export default function UsersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, isAdmin } = usePermission();
  const { user: currentUser } = useAuth();
  // Branch-wise supervisor scoping: a non-admin staff member with
  // supervisorBranchIds set only sees staff belonging to those branches.
  const supervisorBranchIds: string[] = useMemo(
    () => (!isAdmin && currentUser?.supervisorBranchIds?.length) ? currentUser.supervisorBranchIds : [],
    [isAdmin, currentUser?.supervisorBranchIds]
  );
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Search runs on the server, so wait for a short pause in typing.
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Server-side pagination for the Staff Directory table. `role` and
  // `isActive` are real backend filters (see getUsers) so they're sent
  // through; free-text search and the Branch filter aren't supported
  // server-side, so they keep filtering client-side over whatever page is
  // currently loaded (see filteredUsers below).
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, branchesData, rolesData, deptsData, desigsData, shiftsData] = await Promise.all([
        staffService.getPage({
          page: currentPage,
          limit: itemsPerPage,
          search: debouncedSearch.trim() || undefined,
          hrmsBranchId: branchFilter === "all" ? undefined : branchFilter,
          role: roleFilter === "all" ? undefined : roleFilter,
          isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        }),
        hrmsbranchService.getAll(),
        roleService.getAll(),
        departmentService.getAll(),
        designationService.getAll(),
        shiftService.getAll()
      ]);

      setUsers(usersRes.data);
      setTotalUsers(usersRes.total);
      setTotalPages(usersRes.totalPages);
      setBranches(branchesData.data || []);

      const mappedRoles: RoleDefinition[] = rolesData.map((r: any) => ({
        id: r._id || r.id,
        role: r.role || r.name?.toLowerCase().replace(/\s+/g, "_") || "",
        label: r.label || r.name || "Unknown Role",
        icon: r.icon || "Shield",
        color: r.color || "bg-primary/10 text-primary border-primary/20",
        description: r.description || "",
        permissions: r.permissions || [],
      }));
      setRoles(mappedRoles);

      setDepartments(deptsData);
      setDesignations(desigsData);
      setShifts(shiftsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to refresh data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentPage, roleFilter, statusFilter, debouncedSearch, branchFilter]);

  // Reset back to page 1 whenever a filter changes, since they're all server
  // params now and a stale page could point past the new result set.
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, debouncedSearch, branchFilter]);

  // Search (name / email / mobile / code), branch, role and status are all
  // filtered server-side across ALL employees — searching used to look only at
  // the 25 rows of the current page, so e.g. a second "Anjali" never showed.
  const filteredUsers = useMemo(() => {
    // A supervisor (supervisorBranchIds set) only sees staff of their branches.
    let result = users.filter((u) => {
      const b = (u as any).hrmsBranchId;
      const userBranchId = String((b && typeof b === "object" ? b._id || b.id : b) || "");
      return supervisorBranchIds.length === 0 || supervisorBranchIds.includes(userBranchId);
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, sortConfig, supervisorBranchIds]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const toggleUserStatus = (user: User) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    staffService.update(user.id, { isActive: newStatus === "active" }).then(() => {
      // Re-fetch rather than splice locally: with server-side pagination +
      // an active status filter, a locally-toggled row can now fall outside
      // the filter (e.g. "Active Only") and needs to actually leave the page.
      fetchAllData();
      toast({
        title: "Status Updated",
        description: `${user.name}'s account is now ${newStatus}.`,
      });
    });
  };

  const handleDeleteUser = async (id: string) => {
    const ok = await confirm({ title: "Remove Staff Member", description: "This employee record will be permanently deleted. This action cannot be undone.", variant: "danger" });
    if (!ok) return;
    staffService.delete(id).then(() => {
      // Re-fetch rather than splice locally: with server-side pagination the
      // next page's row needs to slide up to fill the gap left behind, and
      // totalUsers/totalPages need to reflect the real remaining count.
      fetchAllData();
      toast({
        title: "Staff Removed",
        description: "The employee record has been deleted.",
        variant: "destructive",
      });
    });
  };



  // `users`/`filteredUsers` now only hold the current (paginated) page, but
  // Export has always meant "export the full filtered staff list" — so this
  // pulls the complete unpaginated list via getAll() and re-applies the same
  // search/role/branch/status criteria as filteredUsers, instead of silently
  // truncating the export to whatever page happens to be on screen.
  const exportToExcel = async () => {
    let sourceUsers: User[] = users;
    try {
      const all = await staffService.getAll();
      if (Array.isArray(all)) sourceUsers = all;
    } catch {
      // fall back to the currently loaded page if the full-list fetch fails
    }

    const exportFiltered = sourceUsers.filter((u) => {
      const roleStr = typeof u.role === "string" ? u.role : u.role?.role || "";
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        roleStr.replace("_", " ").toLowerCase().includes(searchQuery.toLowerCase());
      const roleId = (u.role && typeof u.role === "object") ? u.role.id : (u.role as string || "");
      const matchesRole = roleFilter === "all" || roleId === roleFilter;
      const matchesStore = branchFilter === "all" || (u as any).hrmsBranchId === branchFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStore && matchesStatus;
    });

    // Same column headers as the Import template (SYSTEM_FIELDS.default), so the
    // file can be edited and re-imported with "Update existing staff" ticked.
    // Numbers like account no / Aadhaar are written as text so Excel doesn't
    // turn them into 1.23E+11; dates as DD/MM/YYYY.
    const idOf = (v: any) => (v && typeof v === "object" ? v._id || v.id : v) || "";
    const nameOf = (v: any) => (v && typeof v === "object" ? v.name || "" : "");
    const fmtDate = (d: any) => {
      if (!d) return "";
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? "" : `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
    };
    const txt = (v: any) => (v === undefined || v === null ? "" : String(v));

    const dataToExport = exportFiltered.map((u: any) => {
      const role = (u.role && typeof u.role === "object") ? u.role.label : (u.role || "");
      const branch = branches.find(s => (s._id || s.id) === idOf(u.hrmsBranchId))?.name || "";
      const shift = shifts.find(s => s._id === idOf(u.shiftId))?.name || "";
      const sc = u.salaryConfig || {};
      const hasStructure = !!u.salaryStructureId;
      return {
        "Employee Code": txt(u.employeeCode),
        "Employee Name": txt(u.name),
        "Email": txt(u.email),
        "Mobile No": txt(u.mobile),
        "Gender": txt(u.gender),
        "Department": nameOf(u.department),
        "Designation": nameOf(u.designation),
        "Branch": branch,
        "Shift": shift,
        "Role": txt(role),
        "Status": txt(u.status),
        "Employment Type": txt(u.employmentType),
        "Salary Type": txt(u.payType),
        "Salary": txt(u.salaryAmount),
        "Basic": hasStructure ? txt(sc.basic?.value) : "",
        "HRA": hasStructure ? txt(sc.hra?.value) : "",
        "PF Applicable": hasStructure ? (sc.pf?.isIncluded ? "Yes" : "No") : "",
        "PF Mode": hasStructure && sc.pf?.isIncluded ? (sc.pf?.mode === "fixed_monthly" ? "Fixed monthly" : "Per day") : "",
        "PF Amount": hasStructure && sc.pf?.isIncluded ? txt(sc.pf?.value) : "",
        "PF Rate (%)": hasStructure && sc.pf?.isIncluded ? txt(sc.pf?.rate ?? 12) : "",
        "ESIC Amount": hasStructure && sc.esic?.value ? txt(sc.esic.value) : "",
        "Date of Joining": fmtDate(u.joiningDate),
        "Date of Birth": fmtDate(u.dob),
        "Bank Name": txt(u.bankInfo?.bankName),
        "Account Holder Name": txt(u.bankInfo?.accountName),
        "Account No": txt(u.bankInfo?.accountNumber),
        "IFSC Code": txt(u.bankInfo?.ifscCode),
        "Bank Branch": txt(u.bankInfo?.branchCity),
        "Current Address": txt(u.address?.current),
        "Permanent Address": txt(u.address?.permanent),
        "PAN Number": txt(u.legalDocuments?.panNumber),
        "Aadhaar Number": txt(u.legalDocuments?.aadhaarNumber),
        "Emergency Contact Name": txt(u.emergencyContact?.name),
        "Emergency Mobile": txt(u.emergencyContact?.phone),
        "Emergency Contact Relation": txt(u.emergencyContact?.relation),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet["!cols"] = Object.keys(dataToExport[0] || {}).map((h) => ({ wch: Math.max(12, h.length + 2) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff List");
    XLSX.writeFile(workbook, `Staff_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Import related logic
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // `key` = backend import field (import_employees_controller.js), `default` =
  // the column header used by Template, Export and Import alike — so an
  // exported file can be edited and imported straight back. Older sheets
  // ("Code*", "Employee Name*"...) still match via the loose second pass.
  const [updateExisting, setUpdateExisting] = useState(false);
  // Row (0-based) holding the column headers — rows above it (sheet titles)
  // are ignored by both the mapping screen and the backend import.
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const SYSTEM_FIELDS = [
    { key: "employeeCode", label: "Employee Code", default: "Employee Code" },
    { key: "name", label: "Full Name", default: "Employee Name" },
    { key: "email", label: "Email Address", default: "Email" },
    { key: "mobile", label: "Mobile Number", default: "Mobile No" },
    { key: "gender", label: "Gender", default: "Gender" },
    { key: "department", label: "Department", default: "Department" },
    { key: "designation", label: "Designation", default: "Designation" },
    { key: "hrmsBranchId", label: "Branch", default: "Branch" },
    { key: "shiftId", label: "Shift", default: "Shift" },
    { key: "password", label: "Password", default: "Password" },
    { key: "employmentType", label: "Employment Type", default: "Employment Type" },
    { key: "payType", label: "Pay Type", default: "Salary Type" },
    { key: "salaryAmount", label: "Salary/CTC", default: "Salary" },
    { key: "basic", label: "Basic", default: "Basic" },
    { key: "hra", label: "HRA", default: "HRA" },
    { key: "pfApplicable", label: "PF Applicable (Yes/No)", default: "PF Applicable" },
    { key: "pfMode", label: "PF Mode (Fixed monthly/Per day)", default: "PF Mode" },
    { key: "pfAmount", label: "PF Amount", default: "PF Amount" },
    { key: "pfRate", label: "PF Rate (%)", default: "PF Rate (%)" },
    { key: "esicAmount", label: "ESIC Amount", default: "ESIC Amount" },
    { key: "joiningDate", label: "Date of Joining", default: "Date of Joining" },
    { key: "dob", label: "Date of Birth", default: "Date of Birth" },
    { key: "bankName", label: "Bank Name", default: "Bank Name" },
    { key: "accountName", label: "Account Holder Name", default: "Account Holder Name" },
    { key: "accountNumber", label: "Account Number", default: "Account No" },
    { key: "ifscCode", label: "IFSC Code", default: "IFSC Code" },
    { key: "branchCity", label: "Bank Branch/City", default: "Bank Branch" },
    { key: "currentAddress", label: "Current Address", default: "Current Address" },
    { key: "permanentAddress", label: "Permanent Address", default: "Permanent Address" },
    { key: "panNumber", label: "PAN Number", default: "PAN Number" },
    { key: "aadhaarNumber", label: "Aadhaar Number", default: "Aadhaar Number" },
    { key: "emergencyName", label: "Emergency Contact Name", default: "Emergency Contact Name" },
    { key: "emergencyPhone", label: "Emergency Mobile", default: "Emergency Mobile" },
    { key: "emergencyRelation", label: "Emergency Contact Relation", default: "Emergency Contact Relation" },
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // blankrows: true keeps blank rows so indices line up with real sheet
        // rows — the backend re-reads the sheet starting at this exact row.
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, blankrows: true, defval: "" });
        const firstSheetRow = XLSX.utils.decode_range(ws["!ref"] || "A1").s.r;

        // "D.O.B" → "dob", "A/C No." → "acno", "Employee Name*" → "employeename"
        const norm = (s: any) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const knownNames = new Set(
          SYSTEM_FIELDS.flatMap((f) => [f.default, f.label, ...(FIELD_ALIASES[f.key] || [])]).map(norm)
        );

        // Many company sheets start with a title row ("EMPLOYEE MASTER DATABASE
        // AND PAYROLL - <site>") or blank rows — pick the row in the first 15 that
        // looks most like a header row instead of always using row 1.
        let headerRow = 0;
        let bestScore = -1;
        data.slice(0, 15).forEach((row, idx) => {
          const cells = (row || []).map((c) => String(c ?? "").trim()).filter(Boolean);
          if (cells.length < 2) return;
          const known = cells.filter((c) => knownNames.has(norm(c))).length;
          const score = known * 10 + cells.length;
          if (score > bestScore) { bestScore = score; headerRow = idx; }
        });

        // Same column names the backend's sheet_to_json will use: duplicates get
        // "_1", "_2"; blank header cells are skipped.
        const seen: Record<string, number> = {};
        const headers: string[] = [];
        (data[headerRow] || []).forEach((cell) => {
          const h = String(cell ?? "").trim();
          if (!h) return;
          const n = seen[h] ?? 0;
          seen[h] = n + 1;
          headers.push(n ? `${h}_${n}` : h);
        });
        setHeaderRowIndex(firstSheetRow + headerRow); // absolute sheet row (0-based)
        setExcelHeaders(headers);

        const initialMapping: Record<string, string> = {};
        const used = new Set<string>();
        // Pass 1 — exact matches (field name, label or a known alias) for every
        // field, so e.g. "Branch" doesn't grab "Bank Branch".
        SYSTEM_FIELDS.forEach(field => {
          const names = [field.default, field.label, ...(FIELD_ALIASES[field.key] || [])].map(norm);
          const match = headers.find(h => !used.has(h) && names.includes(norm(h)));
          if (match) { initialMapping[field.key] = match; used.add(match); }
        });
        // Pass 2 — loose matches only for fields still unmapped, and never reusing
        // a column already taken (a "Salary" column used to land in Pay Type too,
        // since "salary type" contains "salary" → "25000 is not a valid payType").
        SYSTEM_FIELDS.forEach(field => {
          if (initialMapping[field.key]) return;
          const match = headers.find(h =>
            !used.has(h) && norm(h).length > 2 &&
            (norm(h).includes(norm(field.label)) || norm(field.default).includes(norm(h)))
          );
          if (match) { initialMapping[field.key] = match; used.add(match); }
        });
        setFieldMapping(initialMapping);
        setImportResult(null);
        setIsMappingOpen(true);
      } catch (err) {
        toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Per-row outcome of the last import, shown in a dialog so failed rows can be fixed.
  const [importResult, setImportResult] = useState<BulkResult | null>(null);

  // Sends the file + column mapping to POST /import/bulk, which creates each
  // employee plus their linked CRM Staff login (import_employees_controller.js).
  // The backend reads the HRMS branch under "hrmsBranchId" (not "storeId").
  const handleImport = async () => {
    if (!pendingFile) return;
    setIsImporting(true);
    try {
      const mapping = Object.fromEntries(Object.entries(fieldMapping).filter(([, col]) => col && col !== "skip"));
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("updateExisting", String(updateExisting));
      formData.append("headerRow", String(headerRowIndex));
      const res = await staffService.bulkImport(formData);
      setIsMappingOpen(false);
      setPendingFile(null);
      setImportResult(res);
      fetchAllData();
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  // Blank sheet with every importable column, header row = the default column names.
  const downloadTemplate = () => {
    const headers = SYSTEM_FIELDS.map((f) => f.default);
    const sample: Record<string, string> = {
      "Employee Code": "EMP001", "Employee Name": "Ravi Kumar", "Email": "ravi@example.com", "Mobile No": "9876543210",
      "Gender": "Male", "Department": "Sales", "Designation": "Executive",
      "Branch": branches[0]?.name || "", "Shift": shifts[0]?.name || "", "Password": "",
      "Employment Type": "permanent", "Salary Type": "Monthly", "Salary": "25000", "Basic": "15000", "HRA": "5000",
      "PF Applicable": "Yes", "PF Mode": "Fixed monthly", "PF Amount": "", "PF Rate (%)": "12", "ESIC Amount": "",
      "Date of Joining": "01/04/2026", "Date of Birth": "15/08/1995",
      "Bank Name": "HDFC Bank", "Account Holder Name": "Ravi Kumar", "Account No": "50100123456789", "IFSC Code": "HDFC0001234", "Bank Branch": "Ahmedabad",
      "Current Address": "12, MG Road, Ahmedabad", "Permanent Address": "12, MG Road, Ahmedabad",
      "PAN Number": "ABCDE1234F", "Aadhaar Number": "123412341234",
      "Emergency Contact Name": "Sita Kumar", "Emergency Mobile": "9876500000", "Emergency Contact Relation": "Mother",
    };
    const ws = XLSX.utils.json_to_sheet([Object.fromEntries(headers.map((h) => [h, sample[h] ?? ""]))], { header: headers });
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff");
    XLSX.writeFile(wb, "Staff_Import_Demo.xlsx");
  };

  /* ── Selection + Bulk Edit ── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const pageAllSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.has(u.id));
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredUsers.forEach((u) => (pageAllSelected ? next.delete(u.id) : next.add(u.id)));
      return next;
    });
  const hrmsBasePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#1a1a1a] tracking-tight">Staff Directory</h1>
          <p className="text-[13px] font-medium text-slate-500">Manage organizational structure and employee records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9 px-4 font-medium border-slate-200 bg-white shadow-sm hover:bg-slate-50 flex items-center gap-2" onClick={exportToExcel}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          {hasPermission("edit_staff") && selectedIds.size > 0 && (
            <Button size="sm" className="rounded-md h-9 px-4 font-medium gradient-primary text-white border-0 shadow-sm flex items-center gap-2" onClick={() => setIsBulkEditOpen(true)}>
              <Edit2 className="h-3.5 w-3.5" /> Bulk Edit ({selectedIds.size})
            </Button>
          )}
          {/* Single staff are still created via Setup > Staff (main CRM); these
              are the bulk onboarding paths — both also create the CRM Staff login. */}
          {(hasPermission("create_staff") || hasPermission("manage_users")) && (
            <>
              <Button variant="outline" size="sm" className="rounded-md h-9 px-4 font-medium border-slate-200 bg-white shadow-sm hover:bg-slate-50 flex items-center gap-2" onClick={downloadTemplate}>
                <FileIcon className="h-3.5 w-3.5" /> Demo
              </Button>
              <div className="relative">
                <input type="file" id="import-excel" className="hidden" accept=".xlsx, .xls" onChange={(e) => { handleFileSelect(e); e.target.value = ""; }} />
                <Button variant="outline" size="sm" className="rounded-md h-9 px-4 font-medium border-slate-200 bg-white shadow-sm hover:bg-slate-50 flex items-center gap-2" onClick={() => document.getElementById('import-excel')?.click()}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel
                </Button>
              </div>
              <Button variant="outline" size="sm" className="rounded-md h-9 px-4 font-medium border-slate-200 bg-white shadow-sm hover:bg-slate-50 flex items-center gap-2" onClick={() => navigate(`${hrmsBasePath}/staff/users/bulk-add`)}>
                <Plus className="h-3.5 w-3.5" /> Bulk Add
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats & Filters */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center text-white shadow-sm">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 tracking-tight">Active Staff Directory</h2>
              <p className="text-[11px] font-medium text-slate-500 tracking-wide">{totalUsers} Employees Registered</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 rounded-md border-slate-200 bg-white shadow-sm font-medium text-sm"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 rounded-md border-slate-200 bg-white px-3 font-medium gap-2 shadow-sm text-sm">
                  <Filter className="h-3.5 w-3.5" /> Filters
                  {(roleFilter !== "all" || branchFilter !== "all" || statusFilter !== "all") && (
                    <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center rounded-full bg-primary text-[9px]">
                      {[roleFilter, branchFilter, statusFilter].filter(f => f !== "all").length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-lg p-4 space-y-4 shadow-xl border-border/50">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Security Role</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-9 rounded-md border-gray-200"><SelectValue placeholder="All Roles" /></SelectTrigger>
                    <SelectContent>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}<SelectItem value="all">All Roles</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Branch</Label>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="h-9 rounded-md border-gray-200"><SelectValue placeholder="All Branches" /></SelectTrigger>
                    <SelectContent>{branches.map(s => <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>)}<SelectItem value="all">All Branches</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 rounded-md border-gray-200"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active Only</SelectItem><SelectItem value="inactive">Inactive Only</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" className="w-full h-8 text-[11px] font-bold text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => { setRoleFilter("all"); setBranchFilter("all"); setStatusFilter("all"); }}>Clear All Filters</Button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <DataTable
            data={filteredUsers}
            isLoading={isLoading}
            emptyMessage="No staff members matching your criteria"
            totalItems={totalUsers}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            columns={[
              ...(hasPermission("edit_staff") ? [{
                header: <Checkbox checked={pageAllSelected} onCheckedChange={togglePage} aria-label="Select all on this page" />,
                accessorKey: (u: User) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(u.id)} onCheckedChange={() => toggleSelected(u.id)} aria-label={`Select ${u.name}`} />
                  </div>
                ),
                className: "w-10",
              }] : []),
              {
                header: (
                  <div className="flex items-center gap-2 cursor-pointer select-none hover:text-primary transition-colors font-bold text-foreground/70" onClick={() => requestSort("name")}>
                    Employee Name <ArrowUpDown className={cn("h-3 w-3 transition-opacity", sortConfig?.key === "name" ? "opacity-100" : "opacity-30")} />
                  </div>
                ),
                accessorKey: (u) => (
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-9 w-9 rounded-md border border-slate-100 overflow-hidden shadow-sm shrink-0 bg-slate-50 flex items-center justify-center">
                      <img src={getFileUrl(u.avatar)} alt={u.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="font-semibold text-[12px] text-slate-800 line-clamp-2 leading-tight max-w-[150px]">{u.name}</p>
                  </div>
                ),
                className: "whitespace-normal",
              },
              {
                header: "Email Address",
                accessorKey: (u) => (
                  <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary/60" /> {u.email}
                  </div>
                ),
              },
              {
                header: "Phone Number",
                accessorKey: (u) => u.mobile ? (
                  <WhatsAppQuickChat phone={u.mobile} data={{ customer_name: u.name }} />
                ) : (
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/50" /> —
                  </div>
                ),
              },
              {
                header: "Security Role",
                accessorKey: (u) => {
                  const roleLabel = (u.role && typeof u.role === "object") ? u.role.label : ((u.role as string || "").replace("_", " "));
                  return <Badge variant="outline" className="rounded-md py-0.5 px-2 text-[10px] font-semibold border-slate-200 text-slate-600 bg-slate-50">{roleLabel}</Badge>;
                },
              },
              {
                header: "Branch",
                accessorKey: (u) => {
                  const branchId = (u as any).hrmsBranchId?._id || (u as any).hrmsBranchId;
                  const branch = branches.find(s => (s._id || s.id) === branchId);
                  return (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[12px] font-semibold text-foreground/80">{branch?.name || "—"}</span>
                    </div>
                  );
                },
              },
              {
                header: "Status",
                accessorKey: (u) => (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border transition-all ${hasPermission("edit_staff") ? "cursor-pointer" : "cursor-default opacity-80"} ${u.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    onClick={() => hasPermission("edit_staff") && toggleUserStatus(u)}
                  >
                    <span className="capitalize">{u.status}</span>
                  </Badge>
                ),
              },
              {
                header: <div className="sticky right-0 bg-inherit px-3 z-20">Actions</div>,
                className: "sticky right-0 bg-inherit z-10 text-right border-l border-slate-50 shadow-[-12px_0_15px_-12px_rgba(0,0,0,0.1)]",
                accessorKey: (u) => (
                  <div className="flex items-center justify-end gap-2 pr-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-all" onClick={() => {
                      const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
                      navigate(`${basePath}/staff/users/view/${u.id}`);
                    }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {hasPermission("edit_staff") && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50 transition-all" onClick={() => {
                        const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
                        navigate(`${basePath}/staff/users/edit/${u.id}`);
                      }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission("delete_staff") && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 transition-all" onClick={() => handleDeleteUser(u.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Image Preview Overlay */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-10 animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
          <Button variant="ghost" size="icon" className="absolute top-10 right-10 text-white hover:bg-white/20 rounded-full" onClick={() => setPreviewImage(null)}>
            <X className="h-8 w-8" />
          </Button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
        </div>
      )}

      {/* Excel Mapping Dialog */}
      <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
        <DialogContent className="max-w-3xl rounded-lg border border-slate-200 shadow-2xl bg-white">
          <DialogHeader><DialogTitle className="text-lg font-semibold">Import Field Mapping</DialogTitle></DialogHeader>
          <div className="p-4 space-y-6">
            <p className="text-sm text-muted-foreground font-medium">Map your Excel columns to the system fields. We've tried to auto-match them for you.</p>
            <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 cursor-pointer">
              <Checkbox checked={updateExisting} onCheckedChange={(v) => setUpdateExisting(!!v)} className="mt-0.5" />
              <span className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Update existing staff (matched by Email)</span><br />
                Rows whose email already exists update that employee — only the cells you filled in change, blank cells keep the current value.
                Leave unticked to only add new staff (existing emails are reported as errors).
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
              {SYSTEM_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{field.label}</Label>
                  <Select value={fieldMapping[field.key]} onValueChange={(val) => setFieldMapping({ ...fieldMapping, [field.key]: val })}>
                    <SelectTrigger className="h-10 rounded-md bg-slate-50 border-0">
                      <SelectValue placeholder="Skip Field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip Field</SelectItem>
                      {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {importResult && (
              <div className="space-y-2 rounded-md border border-slate-200 p-3 bg-slate-50">
                <p className="text-xs font-bold text-slate-700">
                  {importResult.success} succeeded, {importResult.failed} failed
                </p>
                {importResult.errors.length > 0 && (
                  <div className="max-h-[120px] overflow-y-auto space-y-1 pr-2">
                    {importResult.errors.map((err, idx) => (
                      <p key={idx} className="text-[11px] text-rose-600 font-medium">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsMappingOpen(false)} className="rounded-md font-semibold">Cancel</Button>
              <Button onClick={handleImport} disabled={isImporting} className="rounded-md gradient-primary font-semibold shadow-sm px-8">
                {isImporting ? "Importing..." : "Complete Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import result — which rows failed and why */}
      <Dialog open={!!importResult} onOpenChange={(o) => !o && setImportResult(null)}>
        <DialogContent className="max-w-lg rounded-lg bg-white">
          <DialogHeader><DialogTitle className="text-lg font-semibold">Import Result</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{importResult?.success ?? 0} added</Badge>
              {!!importResult?.updated && (
                <Badge className="bg-sky-50 text-sky-700 border-sky-200">{importResult.updated} updated</Badge>
              )}
              <Badge className={cn("border", (importResult?.failed ?? 0) > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                {importResult?.failed ?? 0} failed
              </Badge>
            </div>
            {!!importResult?.errors?.length && (
              <ScrollArea className="max-h-64 rounded-md border border-red-100 bg-red-50/40 p-3">
                <ul className="space-y-1 text-xs text-red-700">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </ScrollArea>
            )}
            <p className="text-xs text-slate-500">Imported staff can log in with their email and the Password column (default 12345678).</p>
          </div>
        </DialogContent>
      </Dialog>

      <BulkEditStaffDialog
        open={isBulkEditOpen}
        userIds={[...selectedIds]}
        branches={branches}
        shifts={shifts as any}
        departments={departments}
        designations={designations as any}
        onClose={() => setIsBulkEditOpen(false)}
        onUpdated={() => { setSelectedIds(new Set()); fetchAllData(); }}
      />


    </div>
  );
}

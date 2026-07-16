import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Badge } from "@/hrms/components/ui/badge";
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
  UserPlus,
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
import { staffService } from "@/hrms/services/staffService";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { roleService } from "@/hrms/services/roleService";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { departmentService } from "@/hrms/services/departmentService";
import { designationService, type Designation } from "@/hrms/services/designationService";
import { shiftService, type Shift } from "@/hrms/services/shiftService";
import { API_BASE_URL } from "@/hrms/services/apiClient";
import { useNavigate } from "react-router-dom";
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

const getFileUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  const baseUrl = API_BASE_URL.replace(/\/api$/, "");
  const cleanPath = url.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${baseUrl}/${cleanPath}`;
};

export default function UsersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [usersData, branchesData, rolesData, deptsData, desigsData, shiftsData] = await Promise.all([
        staffService.getAll(),
        hrmsbranchService.getAll(),
        roleService.getAll(),
        departmentService.getAll(),
        designationService.getAll(),
        shiftService.getAll()
      ]);

      setUsers(usersData);
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
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => {
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
  }, [users, searchQuery, roleFilter, branchFilter, statusFilter, sortConfig]);

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
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, status: newStatus } : u,
        ),
      );
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
      setUsers(users.filter((u) => u.id !== id));
      toast({
        title: "Staff Removed",
        description: "The employee record has been deleted.",
        variant: "destructive",
      });
    });
  };



  const exportToExcel = () => {
    const dataToExport = filteredUsers.map((u) => {
      const role = typeof u.role === "object" ? u.role.label : u.role;
      const branchId = (u as any).hrmsBranchId?._id || (u as any).hrmsBranchId;
      const branch = branches.find(s => (s._id || s.id) === branchId)?.name || "Unassigned";
      return {
        "Full Name": u.name,
        "Email": u.email,
        "Mobile": u.mobile,
        "Role": role,
        "Branch": branch,
        "Status": u.status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staff List");
    XLSX.writeFile(workbook, `Staff_Directory_${new Date().toLocaleDateString()}.xlsx`);
  };

  // Import related logic
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const SYSTEM_FIELDS = [
    { key: "employeeCode", label: "Employee Code", default: "Code*" },
    { key: "name", label: "Full Name", default: "Employee Name*" },
    { key: "email", label: "Email Address", default: "Email" },
    { key: "mobile", label: "Mobile Number", default: "Mobile No*" },
    { key: "gender", label: "Gender", default: "Gender*" },
    { key: "department", label: "Department", default: "Department Name*" },
    { key: "designation", label: "Designation", default: "Designation Name*" },
    { key: "hrmsBranchId", label: "Branch", default: "Branch" },
    { key: "employmentType", label: "Employment Type", default: "Employment Type" },
    { key: "payType", label: "Pay Type", default: "Salary Type*" },
    { key: "salaryAmount", label: "Salary/CTC", default: "Salary" },
    { key: "joiningDate", label: "Date of Joining", default: "Date of Joining" },
    { key: "dob", label: "Date of Birth", default: "Date of Birth" },
    { key: "bankName", label: "Bank Name", default: "Bank Name" },
    { key: "accountNumber", label: "Account Number", default: "Account No" },
    { key: "ifscCode", label: "IFSC Code", default: "IFSC Code" },
    { key: "branchCity", label: "Bank Branch/City", default: "Bank Branch" },
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
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headers = data[0] as string[];
        setExcelHeaders(headers);
        const initialMapping: Record<string, string> = {};
        SYSTEM_FIELDS.forEach(field => {
          const match = headers.find(h =>
            h.toLowerCase().includes(field.label.toLowerCase()) ||
            h.toLowerCase() === field.default.toLowerCase().replace("*", "") ||
            field.default.toLowerCase().includes(h.toLowerCase())
          );
          if (match) initialMapping[field.key] = match;
        });
        setFieldMapping(initialMapping);
        setIsMappingOpen(true);
      } catch (err) {
        toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);
        const mappedData = rawData.map(row => {
          const entry: any = {};
          Object.entries(fieldMapping).forEach(([sysKey, excelKey]) => {
            entry[sysKey] = row[excelKey];
          });
          return entry;
        });
        const res = await staffService.importStaff(mappedData);
        toast({ title: "Import Successful", description: `${res.count} staff members added.` });
        setIsMappingOpen(false);
        fetchAllData();
      };
      reader.readAsBinaryString(pendingFile);
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Import Excel hidden — endpoint not available
          <div className="relative">
            <input type="file" id="import-excel" className="hidden" accept=".xlsx, .xls" onChange={handleFileSelect} />
            <Button variant="outline" size="sm" className="rounded-md h-9 px-4 font-medium border-slate-200 bg-white shadow-sm hover:bg-slate-50 flex items-center gap-2" onClick={() => document.getElementById('import-excel')?.click()}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel
            </Button>
          </div>
          */}
          {hasPermission("manage_users") && (
            <Button size="sm" className="rounded-md h-9 px-4 gradient-primary font-medium shadow-sm flex items-center gap-2" onClick={() => navigate("staff/users/new")}>
              <UserPlus className="h-4 w-4" /> Add Staff
            </Button>
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
              <p className="text-[11px] font-medium text-slate-500 tracking-wide">{filteredUsers.length} Employees Registered</p>
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
            columns={[
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
                  <a
                    href={`tel:${u.mobile}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" /> {u.mobile}
                  </a>
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
                    className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border transition-all ${hasPermission("manage_users") ? "cursor-pointer" : "cursor-default opacity-80"} ${u.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    onClick={() => hasPermission("manage_users") && toggleUserStatus(u)}
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-all" onClick={() => navigate(`staff/users/view/${u.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {hasPermission("manage_users") && (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-amber-600 hover:bg-amber-50 transition-all" onClick={() => navigate(`staff/users/edit/${u.id}`)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 transition-all" onClick={() => handleDeleteUser(u.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
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
            <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-2">
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
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsMappingOpen(false)} className="rounded-md font-semibold">Cancel</Button>
              <Button onClick={handleImport} disabled={isLoading} className="rounded-md gradient-primary font-semibold shadow-sm px-8">Complete Import</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}

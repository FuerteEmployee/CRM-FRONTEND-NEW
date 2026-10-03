import { useState, useRef, useMemo, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { LANGUAGES_ISO } from "@/lib/languages";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Plus,
  Search,
  Upload,
  Filter,
  ChevronRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileJson,
  FileType,
  Printer,
  Eye,
  EyeOff
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { financeService } from "@/api/services/finance.service";
import { staffService } from "@/api/services/staff.service";
import { hrmsbranchService, type HRMSBranch } from "@/hrms/services/hrmsbranchService";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { usePermissions } from "@/hooks/usePermissions";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const LANGUAGES = LANGUAGES_ISO;

// `core` columns mirror the fields shown in the customers table (Company,
// Primary Contact, Primary Email, Phone, Pan/Gst Number, Branch) — these
// stay visible by default. Everything else is optional and hidden behind
// the "Show more fields" toggle so the popup isn't cluttered.
const IMPORT_COLUMNS = [
  { key: "Company Name", sample: "Acme Corporation", required: true, core: true },
  { key: "Branch Name", sample: "Mumbai Branch", required: false, core: true },
  { key: "Connect Person", sample: "John Doe", required: false, core: true },
  { key: "Phone Number", sample: "9876543210", required: false, core: true },
  { key: "Email", sample: "john@acme.com", required: false, core: true },
  { key: "PAN Number", sample: "ABCDE1234F", required: false, core: true },
  { key: "GST Number", sample: "27ABCDE1234F1Z5", required: false, core: true },
  { key: "Customer Reference", sample: "CUST-1001", required: false, core: false },
  { key: "Website", sample: "www.acme.com", required: false, core: false },
  { key: "Address", sample: "123 MG Road", required: false, core: false },
  { key: "City", sample: "Mumbai", required: false, core: false },
  { key: "State", sample: "Maharashtra", required: false, core: false },
  { key: "Zip Code", sample: "400001", required: false, core: false },
  { key: "Country", sample: "India", required: false, core: false },
  { key: "Account details", sample: "Bank of India - 1234567890", required: false, core: false },
  { key: "Sales Person", sample: "Jane Smith", required: false, core: false },
];

const DEFAULT_IMPORT_SAMPLE_COLUMNS = IMPORT_COLUMNS.filter((c) => c.core).map((c) => c.key);

const Customers = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, branchFilter]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(25);

  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({
    massDelete: false,
    groups: "",
  });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [sampleColumns, setSampleColumns] = useState<string[]>(DEFAULT_IMPORT_SAMPLE_COLUMNS);
  const [showMoreColumns, setShowMoreColumns] = useState(false);
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  useOpenCreateModal(() => setIsNewCustomerOpen(true));

  // Entry point for the Calling Agent page's "Create customer from this
  // number" action on an unrecognized-caller row — navigates here with
  // ?prefillPhone=<10-digit number> instead of duplicating the create-
  // customer form on that page.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const prefillPhone = searchParams.get("prefillPhone");
    if (!prefillPhone) return;
    setNewCustomer((prev: any) => ({ ...prev, phonenumber: prefillPhone }));
    setIsNewCustomerOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("prefillPhone");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [importState, setImportState] = useState({
    file: null as File | null,
    group: "",
    defaultPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  interface CustomersPage {
    rows: any[];
    total: number;
    activeCount: number;
    inactiveCount: number;
    pages: number;
  }

  const {
    data: customersResult,
    isLoading,
    error,
  } = useQuery<CustomersPage>({
    queryKey: ["customers", itemsPerPage, currentPage, debouncedSearch, statusFilter, branchFilter],
    queryFn: async () => {
      // "All" keeps the legacy unpaginated fetch (needed anyway for dropdown
      // consumers elsewhere in the app), filtered the same way this page
      // always has — company/branch-name search, status, branch.
      if (itemsPerPage === "all") {
        const all = await customerService.getAll();
        const rows: any[] = Array.isArray(all) ? all : (all?.data ?? []);
        const searchLower = debouncedSearch.toLowerCase();
        const rowsFiltered = rows.filter((c: any) => {
          const matchSearch =
            !searchLower ||
            (c.company || "").toLowerCase().includes(searchLower) ||
            (c.contact_person || "").toLowerCase().includes(searchLower) ||
            (c.email || "").toLowerCase().includes(searchLower) ||
            (c.phonenumber || "").toLowerCase().includes(searchLower) ||
            (c.pan_number || "").toLowerCase().includes(searchLower) ||
            (c.gst_number || "").toLowerCase().includes(searchLower) ||
            getCustomerGroupNames(c).toLowerCase().includes(searchLower) ||
            getCustomerBranchName(c).toLowerCase().includes(searchLower);
          const matchStatus =
            statusFilter === "all" || (c.active ? "Active" : "Inactive") === statusFilter;
          const matchBranch = branchFilter === "all" || getCustomerBranchId(c) === branchFilter;
          return matchSearch && matchStatus && matchBranch;
        });
        const activeCount = rowsFiltered.filter((c: any) => c.active).length;
        return {
          rows: rowsFiltered,
          total: rowsFiltered.length,
          activeCount,
          inactiveCount: rowsFiltered.length - activeCount,
          pages: 1,
        };
      }

      const res: any = await customerService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        branch: branchFilter !== "all" ? branchFilter : undefined,
      });
      // Defensive: the shared apiClient swallows non-auth errors into `[]`,
      // which would otherwise crash the `.data`/`.total` access below.
      if (Array.isArray(res)) {
        return { rows: [], total: 0, activeCount: 0, inactiveCount: 0, pages: 1 };
      }
      return {
        rows: res?.data ?? [],
        total: res?.total ?? 0,
        activeCount: res?.activeCount ?? 0,
        inactiveCount: res?.inactiveCount ?? 0,
        pages: res?.pages ?? 1,
      };
    },
    placeholderData: keepPreviousData,
  });

  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
    staleTime: 5 * 60 * 1000,
  });

  const { data: groups = [] } = useQuery<any[]>({
    queryKey: ["customerGroups"],
    queryFn: customerService.getGroups,
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  // Fetched once and filtered on the client — city -> branch is derived locally, no per-city API call
  const { data: branches = [] } = useQuery<HRMSBranch[]>({
    queryKey: ["hrms-branches-for-customer"],
    queryFn: async () => (await hrmsbranchService.getAll()).data,
    staleTime: 5 * 60 * 1000,
  });

  const branchCities = useMemo(
    () => Array.from(new Set(branches.map((b) => b.city).filter(Boolean))).sort() as string[],
    [branches]
  );

  const deleteMutation = useMutation({
    mutationFn: customerService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Deleted",
        description: "Customer deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const handleBulkAction = async () => {
    if (selectedCustomers.length === 0) {
      toast({ title: "Error", description: "No customers selected."});
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await customerService.bulkDelete(selectedCustomers);
        toast({ title: "Success", description: `Deleted ${selectedCustomers.length} customers.` });
      } else {
        const updates: any = {};
        if (bulkState.groups) updates.groups = [bulkState.groups];

        if (Object.keys(updates).length > 0) {
          await Promise.all(selectedCustomers.map(id => customerService.update(id, updates)));
          toast({ title: "Success", description: `Updated ${selectedCustomers.length} customers.` });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomers([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, groups: "" });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to perform bulk action."});
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSelectAll = () => {
    const pageIds = paginatedCustomers.map((c: any) => c._id);
    const allSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedCustomers.includes(id));
    setSelectedCustomers(prev =>
      allSelected ? prev.filter((id: string) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };

  const getCustomerBranchId = (c: any) =>
    (typeof c.branch === "string" ? c.branch : c.branch?._id || c.branch?.id) || "";

  const getCustomerBranchName = (c: any) =>
    (c.branch as any)?.name ||
    branches.find((b: any) => (b._id || b.id) === c.branch || (b._id || b.id) === c.branch?._id || (b._id || b.id) === c.branch?.id)?.name ||
    (typeof c.branch === "string" ? c.branch : "") ||
    "";

  // Groups are usually populated on the row already (objects with `.name`);
  // falls back to the raw id string when they aren't, same spirit as
  // getCustomerBranchName above.
  const getCustomerGroupNames = (c: any) =>
    (c.groups || []).map((g: any) => (typeof g === "string" ? g : g?.name || "")).join(" ");

  // Export needs the *full* filtered set, not just the current page, so it
  // fetches on demand (same legacy unpaginated endpoint the rest of the app
  // relies on) instead of keeping every row in memory just in case.
  const handleExport = async (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (type === "print" || type === "pdf") {
      if (totalCustomers === 0) {
        toast({ title: "Error", description: "No data to export", variant: "destructive" });
        return;
      }
      if (type === "pdf") {
        toast({ title: "Print Mode", description: "Ready to save - choose Save as PDF in print options" });
      }
      window.print();
      return;
    }

    const all = await customerService.getAll();
    const rows0: any[] = Array.isArray(all) ? all : (all?.data ?? []);
    const searchLower = debouncedSearch.toLowerCase();
    const exportRows = rows0.filter((c: any) => {
      const matchSearch =
        !searchLower ||
        (c.company || "").toLowerCase().includes(searchLower) ||
        (c.contact_person || "").toLowerCase().includes(searchLower) ||
        (c.email || "").toLowerCase().includes(searchLower) ||
        (c.phonenumber || "").toLowerCase().includes(searchLower) ||
        (c.pan_number || "").toLowerCase().includes(searchLower) ||
        (c.gst_number || "").toLowerCase().includes(searchLower) ||
        getCustomerGroupNames(c).toLowerCase().includes(searchLower) ||
        getCustomerBranchName(c).toLowerCase().includes(searchLower);
      const matchStatus =
        statusFilter === "all" || (c.active ? "Active" : "Inactive") === statusFilter;
      const matchBranch = branchFilter === "all" || getCustomerBranchId(c) === branchFilter;
      return matchSearch && matchStatus && matchBranch;
    });

    if (exportRows.length === 0) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" });
      return;
    }

    const headers = [
      "Company Name",
      "Customer Reference",
      "Connect Person",
      "Phone Number",
      "Address with State",
      "Email",
      "Pan Number",
      "GST Number",
      "Account details",
      "Sales Person",
      "Branch Name",
      "Active",
      "Groups",
      "Date Created",
    ];
    const rows = exportRows.map((c: any) => [
      c.company || "",
      c.customer_reference || "",
      c.contact_person || "",
      c.phonenumber || "-",
      [c.address, c.city, c.state].filter(Boolean).join(", ") || "-",
      c.email || "-",
      c.pan_number || "",
      c.gst_number || "",
      c.account_details || "",
      c.sales_person ? `${c.sales_person.firstname || ""} ${c.sales_person.lastname || ""}`.trim() : "",
      branches.find((b: any) => b._id === c.branch || b._id === c.branch?._id)?.name || c.branch?.name || (typeof c.branch === "string" ? c.branch : ""),
      c.active ? "Yes" : "No",
      c.groups ? c.groups.map((g: any) => g.name || g).join(", ") : "",
      c.datecreated ? formatDate(c.datecreated) : "-"
    ]);

    const filenameBase = `customers_export_${new Date().toISOString().split('T')[0]}`;

    if (type === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customers");
      XLSX.writeFile(wb, `${filenameBase}.xlsx`);
    } else {
      const csvData = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filenameBase}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    toast({ title: "Success", description: `Exported successfully as ${type.toUpperCase()}` });
  };

  const paginatedCustomers = customersResult?.rows ?? [];
  const totalCustomers = customersResult?.total ?? 0;
  const activeCustomers = customersResult?.activeCount ?? 0;
  const inactiveCustomers = customersResult?.inactiveCount ?? 0;
  const totalPages = customersResult?.pages ?? 1;
  const itemsPerPageNum = itemsPerPage === "all" ? Math.max(totalCustomers, 1) : itemsPerPage;
  const activeContacts = 0;
  const inactiveContacts = 0;
  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Success",
        description: "Customer created successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Updated",
        description: "Customer updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const importFileRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (data: any) => customerService.importClients(data),
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.refetchQueries({ queryKey: ["customers"] });
      setIsImportOpen(false);
      toast({
        title: data.count === 0 ? "No New Customers" : "Import Successful",
        description: data.message || "Customers processed successfully",
        variant: data.count === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const processImportFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    const processRows = (rows: any[]) => {
      const valid = rows.filter(r => r.company || r.Company || r["Company Name"] || r.name || r.Name);
      if (valid.length === 0) {
        toast({ title: "Error", description: "No valid rows found. Ensure a 'company' or 'Company' column exists.", variant: "destructive" });
        return;
      }
      importMutation.mutate(valid as any);
    };

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          processRows(XLSX.utils.sheet_to_json(ws, { defval: "" }));
        } catch {
          toast({ title: "Parsing Error", description: "Could not read Excel file.", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => processRows(res.data as any[]),
      });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportFile(file);
    e.target.value = "";
  };

  const [isImportDragging, setIsImportDragging] = useState(false);
  const handleImportDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importMutation.isPending) setIsImportDragging(true);
  };
  const handleImportDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImportDragging(false);
  };
  const handleImportDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImportDragging(false);
    if (importMutation.isPending) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processImportFile(file);
  };

  const toggleSampleColumn = (key: string) => {
    setSampleColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const handleDownloadSample = () => {
    if (sampleColumns.length === 0) {
      toast({ title: "Error", description: "Select at least one column to download.", variant: "destructive" });
      return;
    }
    const columns = IMPORT_COLUMNS.filter((c) => sampleColumns.includes(c.key));
    const headers = columns.map((c) => c.key);
    const sampleRow = columns.map((c) => c.sample);
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, "customers_sample_import.xlsx");
  };

  const [newCustomer, setNewCustomer] = useState<any>({
    company: "",
    active: true,
  });

  const resetCustomerForm = () => {
    setNewCustomer({ company: "", active: true });
    setEditItem(null);
  };

  const handleSaveCustomer = () => {
    if (!newCustomer.company) {
      toast({
        title: "Warning",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    if (editItem) {
      updateMutation.mutate({ id: (editItem as any)._id, data: newCustomer });
    } else {
      createMutation.mutate(newCustomer);
    }
    resetCustomerForm();
    setIsNewCustomerOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <Link to="/admin/contacts" className="text-sm text-primary hover:underline">
            Contacts →
          </Link>        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-t-2 border-t-border">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{totalCustomers}</p>
              <p className="text-xs text-muted-foreground">Total Customers</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-primary">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {activeCustomers}
              </p>
              <p className="text-xs text-primary">Active Customers</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-destructive">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-destructive">
                {inactiveCustomers}
              </p>
              <p className="text-xs text-destructive">Inactive Customers</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-green-500">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-600">
                {activeContacts}
              </p>
              <p className="text-xs text-green-600">Active Contacts</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-destructive">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-destructive">
                {inactiveContacts}
              </p>
              <p className="text-xs text-destructive">Inactive Contacts</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-muted-foreground">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">0</p>
              <p className="text-xs text-muted-foreground">
                Contacts Logged In
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Dialog
              open={isNewCustomerOpen}
              onOpenChange={(open) => {
                setIsNewCustomerOpen(open);
                if (!open) resetCustomerForm();
              }}
            >
              {can("Customers", "Create") && (
                <DialogTrigger asChild>
                  <Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                    <Plus className="mr-2 h-4 w-4" />
                    New Customer
                  </Button>
                </DialogTrigger>
              )}
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editItem ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="details" className="pt-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="details">Customer Details</TabsTrigger>
                      <TabsTrigger value="billing">
                        Billing & Shipping
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>
                          Company <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Company name"
                          value={newCustomer.company}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              company: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Customer Reference</Label>
                          <Input
                            placeholder="Customer reference"
                            value={newCustomer.customer_reference || ""}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, customer_reference: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Connect Person</Label>
                          <Input
                            placeholder="Contact person name"
                            value={newCustomer.contact_person || ""}
                            onChange={(e) =>
                              setNewCustomer({ ...newCustomer, contact_person: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>VAT Number</Label>
                          <Input
                            placeholder="VAT number"
                            value={newCustomer.vat}
                            onChange={(e) =>
                              setNewCustomer({
                                ...newCustomer,
                                vat: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            type="tel"
                            placeholder="+1 555-0100"
                            value={newCustomer.phonenumber}
                            maxLength={10}
                            inputMode="numeric"
                            onChange={(e) =>
                              setNewCustomer({
                                ...newCustomer,
                                phonenumber: e.target.value.replace(/\D/g, "").slice(0, 10),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="company@example.com"
                            value={newCustomer.email || ""}
                            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Website</Label>
                          <Input
                            type="url"
                            placeholder="https://example.com"
                            value={newCustomer.website || ""}
                            onChange={(e) => setNewCustomer({ ...newCustomer, website: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>PAN Number</Label>
                          <Input
                            placeholder="PAN number"
                            value={newCustomer.pan_number || ""}
                            onChange={(e) => setNewCustomer({ ...newCustomer, pan_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>GST Number</Label>
                          <Input
                            placeholder="GST number"
                            value={newCustomer.gst_number || ""}
                            onChange={(e) => setNewCustomer({ ...newCustomer, gst_number: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Details</Label>
                        <Textarea
                          placeholder="Bank name, account number, IFSC, etc."
                          rows={2}
                          value={newCustomer.account_details || ""}
                          onChange={(e) => setNewCustomer({ ...newCustomer, account_details: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sales Person</Label>
                        <Select
                          value={newCustomer.sales_person || ""}
                          onValueChange={(val) => setNewCustomer({ ...newCustomer, sales_person: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sales person" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map((s: any) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.firstname} {s.lastname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Groups</Label>
                          <div className="flex gap-2">
                            <Select
                              onValueChange={(val) => setNewCustomer({ ...newCustomer, groups: [val]})}
                              value={newCustomer.groups?.[0] || ""}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select group" />
                              </SelectTrigger>
                              <SelectContent>
                                {groups.map((g) => (
                                  <SelectItem key={g._id} value={g._id}>
                                    {g.name}
                                  </SelectItem>
                                ))}
                                {groups.length === 0 && (
                                  <div className="p-2 text-sm text-muted-foreground text-center">No groups found</div>
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Currency</Label>
                          <Select
                            onValueChange={(val) => setNewCustomer({ ...newCustomer, currency: val })}
                            value={newCustomer.currency || ""}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {currencies.map((c: any) => (
                                <SelectItem key={c._id} value={c.name}>{c.symbol} {c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Default Language</Label>
                        <SearchableSelect
                          options={LANGUAGES}
                          placeholder="Select language"
                          value={newCustomer.default_language || ""}
                          onValueChange={(val) => setNewCustomer({ ...newCustomer, default_language: val })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Textarea 
                          placeholder="Full address" 
                          rows={2} 
                          value={newCustomer.address || ""}
                          onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Branch</Label>
                          <Select
                            value={newCustomer.branch || ""}
                            onValueChange={(val) => {
                              const selected = branches.find((b) => (b._id || b.id) === val);
                              setNewCustomer({
                                ...newCustomer,
                                branch: val,
                                city: selected?.city || newCustomer.city,
                                state: selected?.state || newCustomer.state,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((b) => (
                                <SelectItem key={b._id || b.id} value={(b._id || b.id) as string}>
                                  {b.name}{b.city ? ` (${b.city})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>City</Label>
                          <SearchableSelect
                            options={branchCities.map(c => ({ label: c, value: c }))}
                            placeholder="Select city"
                            value={newCustomer.city || ""}
                            onValueChange={(val) => setNewCustomer({ ...newCustomer, city: val })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input
                            placeholder="State"
                            value={newCustomer.state || ""}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Zip Code</Label>
                          <Input 
                            placeholder="Zip code" 
                            value={newCustomer.zip || ""}
                            onChange={(e) => setNewCustomer({ ...newCustomer, zip: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <SearchableSelect
                            options={COUNTRIES.map(c => ({ label: c, value: c }))}
                            placeholder="Select country"
                            value={newCustomer.country || ""}
                            onValueChange={(val) => setNewCustomer({ ...newCustomer, country: val })}
                          />
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="billing" className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-sm">
                            Billing Address
                          </h3>
                          <div className="space-y-2">
                            <Label>Street</Label>
                            <Textarea 
                              placeholder="Street address" 
                              rows={2} 
                              value={newCustomer.billing_street || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, billing_street: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input 
                              placeholder="City" 
                              value={newCustomer.billing_city || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, billing_city: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>State</Label>
                            <Input 
                              placeholder="State" 
                              value={newCustomer.billing_state || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, billing_state: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Zip Code</Label>
                            <Input 
                              placeholder="Zip code" 
                              value={newCustomer.billing_zip || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, billing_zip: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <SearchableSelect
                              options={COUNTRIES.map(c => ({ label: c, value: c }))}
                              placeholder="Select country"
                              value={newCustomer.billing_country || ""}
                              onValueChange={(val) => setNewCustomer({ ...newCustomer, billing_country: val })}
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="font-semibold text-sm">
                            Shipping Address
                          </h3>
                          <div className="space-y-2">
                            <Label>Street</Label>
                            <Textarea 
                              placeholder="Street address" 
                              rows={2} 
                              value={newCustomer.shipping_street || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, shipping_street: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input 
                              placeholder="City" 
                              value={newCustomer.shipping_city || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, shipping_city: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>State</Label>
                            <Input 
                              placeholder="State" 
                              value={newCustomer.shipping_state || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, shipping_state: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Zip Code</Label>
                            <Input 
                              placeholder="Zip code" 
                              value={newCustomer.shipping_zip || ""}
                              onChange={(e) => setNewCustomer({ ...newCustomer, shipping_zip: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <SearchableSelect
                              options={COUNTRIES.map(c => ({ label: c, value: c }))}
                              placeholder="Select country"
                              value={newCustomer.shipping_country || ""}
                              onValueChange={(val) => setNewCustomer({ ...newCustomer, shipping_country: val })}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Same as Customer Info
                        </Button>
                        <Button variant="outline" size="sm">
                          Copy Billing Address
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <div className="flex gap-2 pt-2">
                    <DialogTrigger asChild>
                      <Button className="flex-1" onClick={handleSaveCustomer}>
                        {editItem ? "Update" : "Save"}
                      </Button>
                    </DialogTrigger>
                  </div>
                </DialogContent>
              </Dialog>
            {can("Customers", "Create") && (
              <div>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button
                  variant="outline"
                  className="rounded-xl font-black gap-2 shadow-lg px-6 h-11 uppercase text-xs tracking-widest"
                  disabled={importMutation.isPending}
                  onClick={() => setIsImportOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  {importMutation.isPending ? "Importing..." : "Import Customers"}
                </Button>
                <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                  <DialogContent className="max-w-xl w-full min-w-[340px] sm:min-w-[560px] min-h-[520px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Import Customers</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div
                        onClick={() => importFileRef.current?.click()}
                        onDragOver={handleImportDragOver}
                        onDragLeave={handleImportDragLeave}
                        onDrop={handleImportDrop}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
                          isImportDragging
                            ? "border-primary bg-primary/10 scale-[1.01]"
                            : "border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10"
                        }`}
                      >
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="h-7 w-7 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">
                            {importMutation.isPending
                              ? "Processing spreadsheet..."
                              : isImportDragging
                              ? "Drop the file to upload"
                              : "Drag & drop your file here, or click to choose"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supports .xlsx, .xls, and .csv formats
                          </p>
                        </div>
                        <Button
                          type="button"
                          disabled={importMutation.isPending}
                          className="mt-2 rounded-xl font-bold gap-2 px-6 h-10 text-xs shadow-md"
                        >
                          <Upload className="h-4 w-4" />
                          {importMutation.isPending ? "Importing..." : "Choose File"}
                        </Button>
                      </div>

                      <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-[11.5px] text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>✨</span> Automatic Column Mapping:
                        </p>
                        <p>
                          Your Excel columns (<strong>Company Name, Branch Name, Phone, Email, PAN Number, GST Number, Address, Sales Person</strong>) will be automatically detected and mapped to customers.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/50 p-3 space-y-2">
                        <p className="text-xs font-semibold text-foreground">
                          Select columns to include in sample file:
                        </p>
                        <div className="min-w-[280px] sm:min-w-[480px] w-full grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 pr-1">
                          {IMPORT_COLUMNS.filter((col) => col.core).map((col) => (
                            <label
                              key={col.key}
                              className="flex items-center gap-2 text-xs cursor-pointer select-none"
                            >
                              <Checkbox
                                checked={sampleColumns.includes(col.key)}
                                onCheckedChange={() => toggleSampleColumn(col.key)}
                              />
                              <span className="whitespace-nowrap">
                                {col.key}
                                {col.required && <span className="text-destructive"> *</span>}
                              </span>
                            </label>
                          ))}
                        </div>

                        {showMoreColumns && (
                          <div className="min-w-[280px] sm:min-w-[480px] w-full grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 pr-1 pt-2 border-t border-border/50">
                            {IMPORT_COLUMNS.filter((col) => !col.core).map((col) => (
                              <label
                                key={col.key}
                                className="flex items-center gap-2 text-xs cursor-pointer select-none"
                              >
                                <Checkbox
                                  checked={sampleColumns.includes(col.key)}
                                  onCheckedChange={() => toggleSampleColumn(col.key)}
                                />
                                <span className="whitespace-nowrap">{col.key}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowMoreColumns((v) => !v)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          {showMoreColumns ? (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              Hide optional fields
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-3 w-3" />
                              Show {IMPORT_COLUMNS.filter((c) => !c.core).length} more optional fields
                            </>
                          )}
                        </button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl font-bold gap-2 text-xs mt-1"
                          onClick={handleDownloadSample}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Sample Data
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-b">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(val) => {
                    setItemsPerPage(val === "all" ? "all" : parseInt(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[80px] h-11 rounded-xl font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest">
                      <Download className="h-3.5 w-3.5" />
                      Export
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                      <FileJson className="h-4 w-4 text-blue-600" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                      <FileType className="h-4 w-4 text-red-600" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                      <Printer className="h-4 w-4 text-gray-600" />
                      <span>Print</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest" asChild>
                  <Link to="/admin/contacts">Contacts</Link>
                </Button>
                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedCustomers.length === 0) {
                    toast({ title: "Error", description: "Please select at least one customer first."});
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="mass_delete" 
                          className="border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" 
                          checked={bulkState.massDelete}
                          onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                        />
                        <Label htmlFor="mass_delete" className="text-sm font-semibold text-red-600">Mass Delete</Label>
                      </div>
                      <div className="space-y-1.5 pt-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign to Group</Label>
                        <Select value={bulkState.groups} onValueChange={(val) => setBulkState({...bulkState, groups: val})} disabled={bulkState.massDelete}>
                          <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                            <SelectValue placeholder="Select Group" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map(g => (
                              <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="ghost" onClick={() => setBulkActionOpen(false)} className="font-bold uppercase tracking-widest text-[10px]">Close</Button>
                      <Button onClick={handleBulkAction} disabled={isBulkLoading} className="font-bold uppercase tracking-widest text-[10px]">
                        {isBulkLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-11 rounded-xl w-full sm:w-[200px] text-xs font-bold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={paginatedCustomers.length > 0 && paginatedCustomers.every((c: any) => selectedCustomers.includes(c._id))}
                        onChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>Company ↕</TableHead>
                    <TableHead>Primary Contact</TableHead>
                    <TableHead>Primary Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Pan Number</TableHead>
                    <TableHead>Gst Number</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <SkeletonTableRows rows={6} colSpan={12} />
                  ) : paginatedCustomers.length === 0 ? (
                    <TableEmpty colSpan={13}>No customers found.</TableEmpty>
                  ) : (
                    paginatedCustomers.map((c, i) => (
                      <TableRow
                        key={c._id}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedCustomers.includes(c._id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCustomers([...selectedCustomers, c._id]);
                              else setSelectedCustomers(selectedCustomers.filter(id => id !== c._id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(currentPage - 1) * itemsPerPageNum + i + 1}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {c.company}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.primaryContact ? (
                            <Link to="/admin/contacts" className="text-primary hover:underline">
                              {c.primaryContact.firstname} {c.primaryContact.lastname}
                            </Link>
                          ) : (c.contact_person || "-")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.primaryContact?.email || c.email || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <WhatsAppQuickChat phone={c.phonenumber} data={{ customer_name: c.company }} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.pan_number || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.gst_number || "-"}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={c.active}
                            disabled={!can("Customers", "Edit")}
                            onCheckedChange={(val) =>
                              updateMutation.mutate({
                                id: c._id || "",
                                data: { active: val },
                              })
                            }
                            className="scale-75"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {c.groups?.map((g: any) => (
                              <Badge
                                key={g._id || g}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {g.name || g}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getCustomerBranchName(c) || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(c.datecreated)}
                        </TableCell>
                        <TableCell>
                          <TableActions
                            onView={() => navigate(`/admin/customers/${c._id}`)}
                            onEdit={can("Customers", "Edit") ? () => {
                              const normalized = {
                                ...c,
                                groups: c.groups?.map((g: any) => g._id || g),
                                branch: (c.branch as any)?._id || c.branch || "",
                                sales_person: (c.sales_person as any)?._id || c.sales_person || "",
                              };
                              setEditItem(normalized);
                              setNewCustomer(normalized);
                              setIsNewCustomerOpen(true);
                            } : undefined}
                            onDelete={can("Customers", "Delete") ? () => deleteMutation.mutate(c._id || "") : undefined}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              page={currentPage}
              pageSize={itemsPerPageNum}
              total={totalCustomers}
              onPageChange={(p) => setCurrentPage(Math.min(Math.max(p, 1), totalPages))}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Customers;

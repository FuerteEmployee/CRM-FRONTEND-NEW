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
  ChevronLeft,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { financeService } from "@/api/services/finance.service";
import { staffService } from "@/api/services/staff.service";
import { hrmsbranchService, type HRMSBranch } from "@/hrms/services/hrmsbranchService";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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

const Customers = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
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
  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery<any[]>({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
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
        await Promise.all(selectedCustomers.map(id => customerService.delete(id)));
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
    (typeof c.branch === "string" ? c.branch : c.branch?._id) || "";

  const getCustomerBranchName = (c: any) =>
    branches.find((b: any) => b._id === c.branch || b._id === c.branch?._id)?.name ||
    (c.branch as any)?.name ||
    "";

  const filtered = customers.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      (c.company || "").toLowerCase().includes(searchLower) ||
      getCustomerBranchName(c).toLowerCase().includes(searchLower);
    const matchStatus =
      statusFilter === "all" ||
      (c.active ? "Active" : "Inactive") === statusFilter;
    const matchBranch =
      branchFilter === "all" || getCustomerBranchId(c) === branchFilter;
    return matchSearch && matchStatus && matchBranch;
  });

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (filtered.length === 0) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" });
      return;
    }

    if (type === "csv" || type === "xlsx") {
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
      const rows = filtered.map((c: any) => [
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
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast({ title: "Print Mode", description: "Ready to save - choose Save as PDF in print options" });
      window.print();
    }
  };

  const itemsPerPageNum = itemsPerPage === "all" ? Math.max(filtered.length, 1) : itemsPerPage;
  const totalPages = Math.ceil(filtered.length / itemsPerPageNum);
  const paginatedCustomers = filtered.slice(
    (currentPage - 1) * itemsPerPageNum,
    currentPage * itemsPerPageNum,
  );

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.active).length;
  const inactiveCustomers = customers.filter((c) => !c.active).length;
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
  // Branch picked in the Import Customers dialog — applied to any imported row
  // that doesn't already carry its own "Branch" column value.
  const [importBranchId, setImportBranchId] = useState("");
  const [isAddingImportBranch, setIsAddingImportBranch] = useState(false);
  const [newImportBranchName, setNewImportBranchName] = useState("");

  const createImportBranchMutation = useMutation({
    mutationFn: (name: string) => hrmsbranchService.create({ name }),
    onSuccess: async (res: any) => {
      const created = res?.data?.data || res?.data;
      await queryClient.invalidateQueries({ queryKey: ["hrms-branches-for-customer"] });
      if (created?._id) setImportBranchId(created._id);
      setIsAddingImportBranch(false);
      setNewImportBranchName("");
      toast({ title: "Branch added", description: `"${created?.name || newImportBranchName}" is now saved and selected.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to add branch", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: any) => customerService.importClients(data, importBranchId || undefined),
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      await queryClient.refetchQueries({ queryKey: ["customers"] });
      setIsImportOpen(false);
      setImportBranchId("");
      toast({
        title: data.count === 0 ? "No New Customers" : "Import Successful",
        description: data.message || "Customers imported",
        variant: data.count === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    e.target.value = "";
  };

  const [newCustomer, setNewCustomer] = useState<any>({
    company: "",
    active: true,
  });

  const branchesForSelectedCity = useMemo(
    () => branches.filter((b) => b.city === newCustomer.city),
    [branches, newCustomer.city]
  );

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
          <div className="flex gap-2">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <SearchableSelect
                            options={branchCities.map(c => ({ label: c, value: c }))}
                            placeholder="Select city"
                            value={newCustomer.city || ""}
                            onValueChange={(val) => setNewCustomer({ ...newCustomer, city: val, branch: "" })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input
                            placeholder="State"
                            value={newCustomer.state || ""}
                            onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Branch</Label>
                          <Select
                            value={newCustomer.branch || ""}
                            onValueChange={(val) => setNewCustomer({ ...newCustomer, branch: val })}
                            disabled={!newCustomer.city}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={newCustomer.city ? "Select branch" : "Select a city first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {branchesForSelectedCity.map((b) => (
                                <SelectItem key={b._id || b.id} value={(b._id || b.id) as string}>{b.name}</SelectItem>
                              ))}
                              {newCustomer.city && branchesForSelectedCity.length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground text-center">No branches in this city</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
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
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Import Customers</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        {isAddingImportBranch ? (
                          <div className="flex gap-2">
                            <Input
                              autoFocus
                              placeholder="New branch name"
                              value={newImportBranchName}
                              onChange={(e) => setNewImportBranchName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newImportBranchName.trim()) createImportBranchMutation.mutate(newImportBranchName.trim());
                              }}
                            />
                            <Button
                              type="button"
                              disabled={!newImportBranchName.trim() || createImportBranchMutation.isPending}
                              onClick={() => createImportBranchMutation.mutate(newImportBranchName.trim())}
                            >
                              Add
                            </Button>
                            <Button type="button" variant="outline" onClick={() => { setIsAddingImportBranch(false); setNewImportBranchName(""); }}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <SearchableSelect
                              placeholder="Select branch (optional)"
                              options={branches.map((b) => ({ value: b._id, label: b.name }))}
                              value={importBranchId}
                              onValueChange={setImportBranchId}
                            />
                            <button
                              type="button"
                              className="text-xs font-bold text-primary hover:underline"
                              onClick={() => setIsAddingImportBranch(true)}
                            >
                              + Add new branch
                            </button>
                          </>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Applied to every imported customer unless the file already has its own "Branch" column.
                        </p>
                      </div>
                      <Button className="w-full" onClick={() => importFileRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Choose File
                      </Button>
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

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
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
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-11 rounded-xl w-[200px] text-xs font-bold"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={paginatedCustomers.length > 0 && paginatedCustomers.every((c: any) => selectedCustomers.includes(c._id))}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-3 font-medium">#</th>
                    <th className="p-3 font-medium">Company ↕</th>
                    <th className="p-3 font-medium">Primary Contact</th>
                    <th className="p-3 font-medium">Primary Email</th>
                    <th className="p-3 font-medium">Phone</th>
                    <th className="p-3 font-medium">Pan Number</th>
                    <th className="p-3 font-medium">Gst Number</th>
                    <th className="p-3 font-medium">Active</th>
                    <th className="p-3 font-medium">Groups</th>
                    <th className="p-3 font-medium">Branch</th>
                    <th className="p-3 font-medium">Date Created</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={12} className="p-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={12}
                        className="p-10 text-center text-muted-foreground"
                      >
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c, i) => (
                      <tr
                        key={c._id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selectedCustomers.includes(c._id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCustomers([...selectedCustomers, c._id]);
                              else setSelectedCustomers(selectedCustomers.filter(id => id !== c._id));
                            }}
                          />
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {(currentPage - 1) * itemsPerPage + i + 1}
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium">
                            {c.company}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {c.primaryContact ? (
                            <Link to="/admin/contacts" className="text-primary hover:underline">
                              {c.primaryContact.firstname} {c.primaryContact.lastname}
                            </Link>
                          ) : "-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {c.primaryContact?.email || "-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {c.phonenumber}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {c.pan_number || "-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {c.gst_number || "-"}
                        </td>
                        <td className="p-3">
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
                        </td>
                        <td className="p-3">
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
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {getCustomerBranchName(c) || "-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {formatDate(c.datecreated)}
                        </td>
                        <td className="p-3">
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-3 border-t text-sm text-muted-foreground">
              <span>
                Showing 1 to {Math.min(itemsPerPage, filtered.length)} of{" "}
                {filtered.length} entries
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Customers;

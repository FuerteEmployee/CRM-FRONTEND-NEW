import { useState, useMemo } from "react";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Truck, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vendorService } from "@/api/services/vendor.service";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { hrmsbranchService } from "@/api/services/hrmsbranch.service";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";

const emptyForm = {
  company_name: "",
  vendor_reference: "",
  connect_person: "",
  phone_number: "",
  address: "",
  email: "",
  pan_number: "",
  gst_number: "",
  account_details: "",
  sales_person: "",
  branch: "",
};

const Vendors = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");
  const navigate = useNavigate();

  const { data: branchesRaw = [] } = useQuery<any[]>({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = branchesRaw;

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [formData, setFormData] = useState<any>(emptyForm);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false, sales_person: "" });
  useOpenCreateModal(() => { setEditingVendor(null); setFormData(emptyForm); setIsModalOpen(true); });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: vendorService.getAll,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vendors"] });

  const createMutation = useMutation({
    mutationFn: vendorService.create,
    onSuccess: () => {
      invalidate();
      toast({ title: "Success", description: "Vendor saved successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => vendorService.update(id, data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Success", description: "Vendor updated successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: vendorService.delete,
    onSuccess: () => {
      invalidate();
      toast({ title: "Success", description: "Vendor deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: vendorService.importVendors,
    onSuccess: async (data: any) => {
      await invalidate();
      toast({
        title: data.count === 0 ? "No Vendors Imported" : "Import Successful",
        description: data.message || "Imported vendors",
        variant: data.count === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

  const getField = (row: any, ...candidates: string[]) => {
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach((k) => { normalizedRow[normalizeKey(k)] = row[k]; });
    for (const candidate of candidates) {
      const val = normalizedRow[normalizeKey(candidate)];
      if (val !== undefined && val !== null && String(val).trim() !== "") return val;
    }
    return "";
  };

  // Matches the vendor sheet headers: Company Name | Vendor Reference | Connect person |
  // Phone Number | Address with State | Email | Pan number | GST number | Account details | Sales person
  const processVendorRows = (rows: any[]) => {
    const vendorsData = rows.map((row: any) => ({
      company_name: String(getField(row, "company name", "company", "vendor name", "vendor")),
      vendor_reference: String(getField(row, "vendor reference", "vendor ref", "reference")),
      connect_person: String(getField(row, "connect person", "contact person", "connect")),
      phone_number: String(getField(row, "phone number", "phone", "mobile", "contact number")),
      address: String(getField(row, "address with state", "adress with state", "address", "adress")),
      email: String(getField(row, "email", "email address")),
      pan_number: String(getField(row, "pan number", "pan no", "pan")),
      gst_number: String(getField(row, "gst number", "gstin", "gst no")),
      account_details: String(getField(row, "account details", "bank details", "account")),
      sales_person: String(getField(row, "sales person", "salesperson", "sales man")),
      branch: String(getField(row, "branch name", "branch")),
    }));

    const valid = vendorsData.filter((v) => v.company_name);
    if (valid.length === 0) {
      toast({
        title: "Error",
        description: "No valid rows found. The file needs a 'Company Name' column.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(valid as any);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVendor(null);
    setFormData(emptyForm);
  };

  const handleEdit = (v: any) => {
    setEditingVendor(v);
    setFormData({
      company_name: v.company_name || "",
      vendor_reference: v.vendor_reference || "",
      connect_person: v.connect_person || "",
      phone_number: v.phone_number || "",
      address: v.address || "",
      email: v.email || "",
      pan_number: v.pan_number || "",
      gst_number: v.gst_number || "",
      account_details: v.account_details || "",
      sales_person: v.sales_person || "",
      branch: v.branch || "",
    });
    setIsModalOpen(true);
  };

  const setField = (field: string, value: any) =>
    setFormData((f: any) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!formData.company_name) {
      toast({ title: "Error", description: "Company Name is required", variant: "destructive" });
      return;
    }
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredVendors = useMemo(() => {
    const q = search.toLowerCase();
    return (vendors as any[]).filter((v) => {
      const matchesSearch = !q ||
        v.company_name?.toLowerCase().includes(q) ||
        v.vendor_reference?.toLowerCase().includes(q) ||
        v.connect_person?.toLowerCase().includes(q) ||
        v.phone_number?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.gst_number?.toLowerCase().includes(q) ||
        v.pan_number?.toLowerCase().includes(q) ||
        v.sales_person?.toLowerCase().includes(q) ||
        v.branch?.toLowerCase().includes(q);
      const matchesBranch = branchFilter === "all" || v.branch === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [vendors, search, branchFilter]);

  // Pagination
  const totalItems = filteredVendors.length;
  const pageSize = itemsPerPage === "all" ? (totalItems || 1) : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedVendors =
    itemsPerPage === "all"
      ? filteredVendors
      : filteredVendors.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Selection (page-scoped select-all)
  const pageIds = paginatedVendors.map((v: any) => v._id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Error", description: "No vendors selected."});
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedIds.map((id) => vendorService.delete(id)));
        toast({ title: "Success", description: `Deleted ${selectedIds.length} vendors.` });
      } else {
        if (!bulkState.sales_person) {
          toast({ title: "Error", description: "Choose Mass Delete or enter a Sales Person to update."});
          setIsBulkLoading(false);
          return;
        }
        await Promise.all(selectedIds.map((id) => vendorService.update(id, { sales_person: bulkState.sales_person })));
        toast({ title: "Success", description: `Updated ${selectedIds.length} vendors.` });
      }
      setSelectedIds([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, sales_person: "" });
      invalidate();
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Export headers match the vendor sheet format exactly
  const exportColumns = [
    { header: "Company Name", key: "company_name" },
    { header: "Vendor Reference", key: "vendor_reference" },
    { header: "Connect person", key: "connect_person" },
    { header: "Phone Number", key: "phone_number" },
    { header: "Address with State", key: "address" },
    { header: "Email", key: "email" },
    { header: "Pan number", key: "pan_number" },
    { header: "GST number", key: "gst_number" },
    { header: "Account details", key: "account_details" },
    { header: "Sales person", key: "sales_person" },
    ...(canUseBranch ? [{ header: "Branch Name", key: "branch" }] : []),
  ];

  const inputCls = "h-11 rounded-xl border-slate-200";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-slate-500";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Vendors</h1>
          </div>
          <div className="flex gap-2 items-center">
            {can("Vendors", "Create") && (
              <ImportButton onData={processVendorRows} loading={importMutation.isPending} label="Import Vendors" />
            )}
            <ExportButton data={filteredVendors} filename="vendors" columns={exportColumns} />
            {can("Vendors", "Create") && (
              <Button
                onClick={() => { setEditingVendor(null); setFormData(emptyForm); setIsModalOpen(true); }}
                className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              >
                <Plus className="h-4 w-4" />
                New Vendor
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Toolbar: per-page, bulk actions, search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b bg-white">
              <div className="flex items-center gap-2">
                <Select
                  value={itemsPerPage === "all" ? "all" : itemsPerPage.toString()}
                  onValueChange={(v) => { setItemsPerPage(v === "all" ? "all" : parseInt(v)); setCurrentPage(1); }}
                >
                  <SelectTrigger className="w-[90px] h-9 text-xs font-bold bg-slate-50 border-slate-200">
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
                <span className="text-xs font-medium text-slate-400">per page</span>

                {(can("Vendors", "Edit") || can("Vendors", "Delete")) && (
                  <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                    if (open && selectedIds.length === 0) {
                      toast({ title: "Error", description: "Please select at least one vendor first."});
                      return;
                    }
                    setBulkActionOpen(open);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                        Bulk Actions{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Bulk Actions — {selectedIds.length} selected</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-5 pt-4">
                        {can("Vendors", "Delete") && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="massDelete"
                              className="border-red-500 data-[state=checked]:bg-red-500"
                              checked={bulkState.massDelete}
                              onCheckedChange={(checked) => setBulkState({ ...bulkState, massDelete: checked as boolean })}
                            />
                            <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-5 pt-5 border-t">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales Person</Label>
                            <Input
                              placeholder="Assign sales person"
                              className="h-10"
                              value={bulkState.sales_person}
                              onChange={(e) => setBulkState({ ...bulkState, sales_person: e.target.value })}
                              disabled={bulkState.massDelete}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="mt-6 border-t pt-4">
                        <DialogClose asChild>
                          <Button variant="outline" className="font-bold uppercase tracking-wider text-xs">Close</Button>
                        </DialogClose>
                        <Button
                          className={`font-bold uppercase tracking-wider text-xs ${bulkState.massDelete ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"} text-white`}
                          onClick={handleBulkAction}
                          disabled={isBulkLoading}
                        >
                          {isBulkLoading ? "Processing..." : bulkState.massDelete ? `Delete ${selectedIds.length} Vendors` : "Confirm"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {canUseBranch && (
                  <Select value={branchFilter} onValueChange={(v) => { setBranchFilter(v); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 w-full sm:w-[180px] text-sm bg-slate-50 border-slate-200">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b._id || b.id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search company, contact, phone, GSTIN, PAN..."
                    className="pl-9 h-9 w-full sm:w-[280px] text-sm bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="p-4 font-bold w-12">
                      <Checkbox className="border-slate-300" checked={allPageSelected} onCheckedChange={toggleSelectAll} />
                    </th>
                    <th className="p-4 font-bold">Company Name</th>
                    <th className="p-4 font-bold">Vendor Reference</th>
                    <th className="p-4 font-bold">Connect Person</th>
                    <th className="p-4 font-bold">Phone Number</th>
                    <th className="p-4 font-bold">Address with State</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">PAN</th>
                    <th className="p-4 font-bold">GST Number</th>
                    <th className="p-4 font-bold">Account Details</th>
                    <th className="p-4 font-bold">Sales Person</th>
                    {canUseBranch && <th className="p-4 font-bold">Branch</th>}
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={12 + (canUseBranch ? 1 : 0)} className="p-4"><Skeleton className="h-6 w-full" /></td>
                      </tr>
                    ))
                  ) : paginatedVendors.length === 0 ? (
                    <tr>
                      <td colSpan={12 + (canUseBranch ? 1 : 0)} className="p-10 text-center text-slate-400 font-medium">
                        No vendors found. Create one or import from Excel.
                      </td>
                    </tr>
                  ) : (
                    paginatedVendors.map((v: any) => (
                      <tr key={v._id} className={`border-b hover:bg-slate-50/50 transition-colors ${selectedIds.includes(v._id) ? "bg-primary/5" : ""}`}>
                        <td className="p-4">
                          <Checkbox
                            className="border-slate-300"
                            checked={selectedIds.includes(v._id)}
                            onCheckedChange={() => toggleSelect(v._id)}
                          />
                        </td>
                        <td className="p-4 font-bold text-slate-800">{v.company_name}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{v.vendor_reference || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{v.connect_person || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{v.phone_number || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600 max-w-[220px] truncate">{v.address || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{v.email || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{v.pan_number || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{v.gst_number || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600 max-w-[180px] truncate">{v.account_details || "-"}</td>
                        <td className="p-4 text-xs font-medium text-slate-600">{v.sales_person || "-"}</td>
                        {canUseBranch && <td className="p-4 text-xs font-medium text-slate-600">{v.branch || "-"}</td>}
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(`/admin/vendors/${v._id}`)}>
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                            {can("Vendors", "Edit") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(v)}>
                                <Pencil className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                            )}
                            {can("Vendors", "Delete") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
                                onClick={() => { if (window.confirm(`Delete vendor ${v.company_name}?`)) deleteMutation.mutate(v._id); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalItems > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-white">
                <div className="text-xs font-medium text-slate-500">
                  Showing {itemsPerPage === "all" ? 1 : (safePage - 1) * pageSize + 1} to {itemsPerPage === "all" ? totalItems : Math.min(safePage * pageSize, totalItems)} of {totalItems} entries
                  {selectedIds.length > 0 && <span className="ml-2 text-primary font-bold">· {selectedIds.length} selected</span>}
                </div>
                {itemsPerPage !== "all" && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-bold"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={safePage === 1}
                    >
                      Previous
                    </Button>
                    <Button variant="default" size="sm" className="h-8 w-8 p-0 text-xs font-bold bg-primary text-primary-foreground">
                      {safePage}
                    </Button>
                    <span className="text-xs text-slate-400 px-1">of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-bold"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={safePage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add / Edit Modal */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor" : "New Vendor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={labelCls}>* Company Name</Label>
                  <Input value={formData.company_name} onChange={(e) => setField("company_name", e.target.value)} placeholder="Vendor / company name" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Vendor Reference</Label>
                  <Input value={formData.vendor_reference} onChange={(e) => setField("vendor_reference", e.target.value)} placeholder="e.g. VEN-1024" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Connect Person</Label>
                  <Input value={formData.connect_person} onChange={(e) => setField("connect_person", e.target.value)} placeholder="Point of contact" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Phone Number</Label>
                  <Input value={formData.phone_number} onChange={(e) => setField("phone_number", e.target.value.replace(/\D/g, "").slice(0, 10))} maxLength={10} inputMode="numeric" placeholder="e.g. 9876543210" className={inputCls} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelCls}>Address with State</Label>
                  <Input value={formData.address} onChange={(e) => setField("address", e.target.value)} placeholder="Full address including state" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setField("email", e.target.value)} placeholder="vendor@example.com" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Sales Person</Label>
                  <Input value={formData.sales_person} onChange={(e) => setField("sales_person", e.target.value)} placeholder="Assigned sales person" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>PAN Number</Label>
                  <Input value={formData.pan_number} onChange={(e) => setField("pan_number", e.target.value.toUpperCase())} placeholder="e.g. ABCDE1234F" className={`${inputCls} uppercase`} />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>GST Number</Label>
                  <Input value={formData.gst_number} onChange={(e) => setField("gst_number", e.target.value.toUpperCase())} placeholder="e.g. 24ABCDE1234F1Z5" className={`${inputCls} uppercase`} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className={labelCls}>Account Details</Label>
                  <Input value={formData.account_details} onChange={(e) => setField("account_details", e.target.value)} placeholder="Bank name / account number / IFSC" className={inputCls} />
                </div>
                {canUseBranch ? (
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Branch</Label>
                    <Select value={formData.branch || "none"} onValueChange={(val) => setField("branch", val === "none" ? "" : val)}>
                      <SelectTrigger className={inputCls}>
                        <SelectValue placeholder="Select branch..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Branch</SelectItem>
                        {branches.map((b: any) => (
                          <SelectItem key={b._id || b.id} value={b.name}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Branch</Label>
                    <Input value={formData.branch} onChange={(e) => setField("branch", e.target.value)} placeholder="e.g. Sparkling Techo Tools" className={inputCls} />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleCloseModal} className="font-bold">Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="font-bold px-8"
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Vendor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Vendors;

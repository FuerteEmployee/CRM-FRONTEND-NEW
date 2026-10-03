import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Edit,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  Tags,
  MapPin,
  ShieldOff,
} from "lucide-react";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Badge } from "@/hrms/components/ui/badge";
import { Card, CardContent } from "@/hrms/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/hrms/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/hrms/components/ui/dialog";
import { Switch } from "@/hrms/components/ui/switch";
import { DataTable } from "@/hrms/components/common/DataTable";
import { hrmsbranchService, getBranchTypeName, type HRMSBranch } from "@/hrms/services/hrmsbranchService";
import { branchTypeService, type BranchType } from "@/hrms/services/branchTypeService";
import { toast } from "sonner";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { StateSelect, CitySelect } from "@/hrms/components/common/LocationSelector";
import { Label } from "@/hrms/components/ui/label";
import { cn } from "@/hrms/lib/utils";

export default function StaffBranchListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState("branches");

  // Branches state
  const [branches, setBranches] = useState<HRMSBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [filterData, setFilterData] = useState({
    search: "",
    state: "all",
    city: "all",
    branchType: "all",
    status: "all",
  });
  const [tempFilters, setTempFilters] = useState({ ...filterData });
  const [filterBranchTypes, setFilterBranchTypes] = useState<BranchType[]>([]);

  // Branch types state
  const [types, setTypes] = useState<BranchType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<BranchType | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [submittingType, setSubmittingType] = useState(false);

  const fetchBranches = useCallback(async (
    page: number,
    search: string,
    state: string,
    city: string,
    branchType: string,
    status: string,
  ) => {
    try {
      setLoading(true);
      const res = await hrmsbranchService.getAll({
        page,
        limit: pageSize,
        search,
        state:      state      === "all" ? "" : state,
        city:       city       === "all" ? "" : city,
        branchType: branchType === "all" ? "" : branchType,
        status:     status     === "all" ? "" : status,
      });
      if (res.success) {
        setBranches(res.data);
        setTotalItems(res.pagination?.total ?? res.data.length);
        if (res.stats) {
          setStats({
            total:    res.stats.total    ?? res.data.length,
            active:   res.stats.active   ?? res.data.filter(b => b.status === "Active").length,
            inactive: res.stats.inactive ?? res.data.filter(b => b.status !== "Active").length,
          });
        } else {
          setStats({
            total:    res.data.length,
            active:   res.data.filter(b => b.status === "Active").length,
            inactive: res.data.filter(b => b.status !== "Active").length,
          });
        }
      }
    } catch {
      toast.error("Failed to fetch HRMS branches");
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const data = await branchTypeService.getAll();
      setTypes(data);
    } catch {
      toast.error("Failed to load branch types");
    } finally {
      setTypesLoading(false);
    }
  }, []);

  // Destructure filter object into primitives so the effect compares by value, not reference
  const { search, state, city, branchType, status } = filterData;

  useEffect(() => {
    if (activeTab === "branches") {
      fetchBranches(currentPage, search, state, city, branchType, status);
    } else {
      loadTypes();
    }
  }, [currentPage, search, state, city, branchType, status, activeTab, fetchBranches, loadTypes]);

  useEffect(() => {
    branchTypeService.getAll().then(data => setFilterBranchTypes(data.filter(t => t.isActive)));
  }, []);

  const handleSearch = () => {
    setFilterData(tempFilters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const reset = { search: "", state: "all", city: "all", branchType: "all", status: "all" };
    setTempFilters(reset);
    setFilterData(reset);
    setCurrentPage(1);
  };

  const handleDeleteBranch = async (id: string) => {
    const ok = await confirm({
      title: "Delete HRMS Branch",
      description: "Are you sure you want to delete this branch? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await hrmsbranchService.delete(id);
      toast.success("Branch deleted successfully");
      fetchBranches(currentPage, search, state, city, branchType, status);
    } catch {
      toast.error("Failed to delete branch");
    }
  };

  const openAddType = () => {
    setEditingType(null);
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setIsTypeDialogOpen(true);
  };

  const openEditType = (bt: BranchType) => {
    setEditingType(bt);
    setFormName(bt.name);
    setFormDescription(bt.description || "");
    setFormIsActive(bt.isActive);
    setIsTypeDialogOpen(true);
  };

  const handleSaveType = async () => {
    if (!formName.trim()) return toast.error("Type name is required");
    setSubmittingType(true);
    try {
      const payload = { name: formName.trim(), description: formDescription.trim(), isActive: formIsActive };
      if (editingType) {
        const updated = await branchTypeService.update(editingType._id || editingType.id!, payload);
        setTypes(prev => prev.map(t => (t._id || t.id) === (editingType._id || editingType.id) ? updated : t));
        toast.success("Branch type updated");
      } else {
        const created = await branchTypeService.create(payload);
        setTypes(prev => [...prev, created]);
        toast.success("Branch type created");
      }
      setIsTypeDialogOpen(false);
      branchTypeService.getAll().then(data => setFilterBranchTypes(data.filter(t => t.isActive)));
    } catch {
      toast.error("Failed to save branch type");
    } finally {
      setSubmittingType(false);
    }
  };

  const handleDeleteType = async (bt: BranchType) => {
    const ok = await confirm({
      title: "Delete Branch Type",
      description: `Delete "${bt.name}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await branchTypeService.delete(bt._id || bt.id!);
      setTypes(prev => prev.filter(t => (t._id || t.id) !== (bt._id || bt.id)));
      toast.success("Branch type deleted");
    } catch {
      toast.error("Failed to delete branch type");
    }
  };

  const formattedBranches = useMemo(() =>
    branches.map((b, idx) => ({
      ...b,
      id: b.id || b._id!,
      sNo: (currentPage - 1) * pageSize + idx + 1,
    })),
    [branches, currentPage, pageSize]
  );

  const filteredTypes = useMemo(() =>
    types
      .filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase()))
      .map((t, i) => ({ ...t, sNo: i + 1 })),
    [types, typeSearch]
  );

  const typeStats = useMemo(() => ({
    total: types.length,
    active: types.filter(t => t.isActive).length,
  }), [types]);

  const branchColumns = [
    { header: "S.No", accessorKey: "sNo", minWidth: 70 },
    { header: "Branch Name", accessorKey: "name", minWidth: 220, className: "font-bold text-[#1a1a1a]" },
    { header: "Branch Type", accessorKey: (b: HRMSBranch) => getBranchTypeName(b.branchType) || "—", minWidth: 140 },
    {
      header: "Supervisors",
      minWidth: 180,
      accessorKey: (b: HRMSBranch) => {
        const names = (b.supervisorIds || []).map((s) => (typeof s === "string" ? "" : s.name)).filter(Boolean);
        return names.length ? <span className="text-xs font-medium text-slate-700">{names.join(", ")}</span> : <span className="text-slate-400">—</span>;
      },
    },
    { header: "City", accessorKey: "city", minWidth: 150 },
    { header: "State", accessorKey: "state", minWidth: 150 },
    { header: "Phone", accessorKey: "phone", minWidth: 140 },
    { header: "Email", accessorKey: "email", minWidth: 200 },
    {
      header: "Status",
      minWidth: 110,
      accessorKey: (b: HRMSBranch) => (
        <Badge variant="outline" className={b.status === "Active"
          ? "bg-emerald-50 text-emerald-700 border-emerald-100 font-bold"
          : "bg-slate-50 text-slate-500 border-slate-100 font-bold"}>
          {b.status}
        </Badge>
      ),
    },
    {
      header: "Geo-Fence Range",
      minWidth: 160,
      accessorKey: (b: HRMSBranch) => {
        if (!b.geoFenceEnabled) {
          return (
            <div className="flex items-center gap-1.5">
              <ShieldOff className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disabled</span>
            </div>
          );
        }
        const rawRadius = b.radius && b.radius > 0 ? b.radius : null;
        if (!rawRadius) {
          return (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
              <MapPin className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-bold text-amber-600 tracking-wider">NOT SET</span>
            </div>
          );
        }
        const radiusKm = rawRadius / 1000; // radius is always stored in metres; radiusUnit is display-only
        const displayKm = radiusKm % 1 === 0 ? radiusKm.toString() : radiusKm.toFixed(2).replace(/\.?0+$/, "");
        return (
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 shadow-sm">
            <div className="h-5 w-5 rounded-md bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-3 w-3 text-white" />
            </div>
            <div className="leading-none">
              <span className="text-[14px] font-black text-emerald-700 tabular-nums">{displayKm}</span>
              <span className="text-[10px] font-bold text-emerald-500 ml-1">KM</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "Actions",
      className: "w-[110px] text-right sticky right-0 bg-inherit shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.1)]",
      accessorKey: (row: any) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl"
            onClick={() => {
              const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
              navigate(`${basePath}/staff/branches/edit/${row.id || row._id}`);
            }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
            onClick={() => handleDeleteBranch(row.id || row._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const typeColumns = [
    { header: "S.No", accessorKey: (row: any) => row.sNo, minWidth: 70 },
    { header: "Type Name", accessorKey: (row: BranchType) => row.name, minWidth: 200, className: "font-semibold text-[#1a1a1a]" },
    { header: "Description", accessorKey: (row: BranchType) => row.description || "", minWidth: 280, className: "text-slate-500 text-xs" },
    {
      header: "Status",
      minWidth: 120,
      accessorKey: (row: BranchType) => (
        <Badge variant="outline" className={row.isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-100 font-bold"
          : "bg-slate-50 text-slate-500 border-slate-100 font-bold"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-[100px] text-right sticky right-0 bg-inherit",
      accessorKey: (row: BranchType) => (
        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => openEditType(row)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDeleteType(row)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const labelClass = "text-[12px] font-semibold text-[#333333] tracking-wider mb-1.5 block";
  const inputClass = "h-10 rounded-md border-slate-300 bg-white text-[#333333] text-sm";

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <PageHeader
        title="Branch Management"
        subtitle="Manage HRMS branches and employee work location assignments"
        action={
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === "branches") {
                const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
                navigate(`${basePath}/staff/branches/new`);
              }
              else openAddType();
            }}
            className="rounded-md gradient-primary text-white border-0 shadow-sm hover:opacity-95 px-4 h-9 font-medium text-xs flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "branches" ? "New HRMS Branch" : "New Branch Type"}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6 border-b border-slate-200">
          <TabsList className="bg-transparent p-0 gap-6 h-10 rounded-none">
            <TabsTrigger
              value="branches"
              className="rounded-none border-b-2 border-transparent px-1 font-bold transition-all data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-slate-500 gap-1.5 text-[13px] tracking-widest"
            >
              <Building2 className="h-3.5 w-3.5" />
              Branches
            </TabsTrigger>
            <TabsTrigger
              value="branch-types"
              className="rounded-none border-b-2 border-transparent px-1 font-bold transition-all data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-slate-500 gap-1.5 text-[13px] tracking-widest"
            >
              <Tags className="h-3.5 w-3.5" />
              Branch Types
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-6 m-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { label: "Total HRMS Branches", value: stats.total, icon: Building2, gradient: "gradient-primary" },
              { label: "Active Branches", value: stats.active, icon: CheckCircle2, gradient: "gradient-success" },
              { label: "Inactive Branches", value: stats.inactive, icon: XCircle, gradient: "gradient-info" },
            ].map((card, i) => (
              <Card key={card.label} className="glass-deep card-hover border-0 overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent className="p-5 relative">
                  <div className={`absolute top-0 right-0 w-20 h-20 ${card.gradient} opacity-[0.08] rounded-bl-[3rem]`} />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.gradient} text-white mb-3 shadow-glow`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
                  <p className="text-[12px] font-semibold text-muted-foreground mt-1">{card.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="glass-deep rounded-2xl p-6 border border-border/40 space-y-4 shadow-sm bg-white/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">Search</Label>
                <Input
                  value={tempFilters.search}
                  onChange={e => setTempFilters({ ...tempFilters, search: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Branch name..."
                  className="h-11 rounded-xl glass border-slate-200 bg-white/50 text-sm font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">Branch Type</Label>
                <Select value={tempFilters.branchType} onValueChange={val => setTempFilters({ ...tempFilters, branchType: val })}>
                  <SelectTrigger className="h-11 rounded-xl glass border-slate-200 bg-white/50 text-sm font-semibold">
                    <SelectValue placeholder="*All" />
                  </SelectTrigger>
                  <SelectContent className="glass-deep border-border/50 rounded-xl">
                    <SelectItem value="all">*All Types</SelectItem>
                    {filterBranchTypes.map(bt => (
                      <SelectItem key={bt._id || bt.id} value={(bt._id || bt.id)!}>{bt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">State</Label>
                <StateSelect
                  value={tempFilters.state}
                  onValueChange={val => setTempFilters({ ...tempFilters, state: val, city: "all" })}
                  allOption
                  className="h-11 rounded-xl glass border-slate-200 bg-white/50 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">City</Label>
                <CitySelect
                  stateName={tempFilters.state}
                  value={tempFilters.city}
                  onValueChange={val => setTempFilters({ ...tempFilters, city: val })}
                  allOption
                  className="h-11 rounded-xl glass border-slate-200 bg-white/50 text-sm font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider ml-1">Status</Label>
                <Select value={tempFilters.status} onValueChange={val => setTempFilters({ ...tempFilters, status: val })}>
                  <SelectTrigger className="h-11 rounded-xl glass border-slate-200 bg-white/50 text-sm font-semibold">
                    <SelectValue placeholder="*All" />
                  </SelectTrigger>
                  <SelectContent className="glass-deep border-border/50 rounded-xl">
                    <SelectItem value="all">*All</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                className="h-10 w-10 rounded-xl gradient-primary text-white shadow-sm hover:opacity-90 active:scale-95"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                onClick={handleReset}
              >
                <RefreshCw className={cn("h-4 w-4 text-slate-400", loading && "animate-spin")} />
              </Button>
            </div>
          </div>

          <div className="animate-fade-in shadow-soft rounded-2xl overflow-hidden border border-border/40 bg-white/50 backdrop-blur-sm">
            <DataTable
              data={formattedBranches}
              columns={branchColumns}
              isLoading={loading}
              emptyMessage="No HRMS branches found. Create one to get started."
              pageSize={pageSize}
              totalItems={totalItems}
              currentPage={currentPage}
              onPageChange={page => setCurrentPage(page)}
              onRowClick={row => {
                const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
                navigate(`${basePath}/staff/branches/edit/${row.id || row._id}`);
              }}
            />
          </div>
        </TabsContent>

        {/* Branch Types Tab */}
        <TabsContent value="branch-types" className="space-y-6 m-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { label: "Total Types", value: typeStats.total, icon: Tags, gradient: "gradient-primary" },
              { label: "Active Types", value: typeStats.active, icon: CheckCircle2, gradient: "gradient-success" },
              { label: "Inactive Types", value: typeStats.total - typeStats.active, icon: XCircle, gradient: "gradient-info" },
            ].map((card, i) => (
              <Card key={card.label} className="glass-deep card-hover border-0 overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent className="p-5 relative">
                  <div className={`absolute top-0 right-0 w-20 h-20 ${card.gradient} opacity-[0.08] rounded-bl-[3rem]`} />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.gradient} text-white mb-3 shadow-glow`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
                  <p className="text-[12px] font-semibold text-muted-foreground mt-1">{card.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="glass-deep rounded-2xl p-5 border border-border/40 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={typeSearch}
                  onChange={e => setTypeSearch(e.target.value)}
                  placeholder="Search branch types..."
                  className="pl-9 h-10 rounded-xl border-slate-200 bg-inherit text-sm"
                />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={loadTypes}>
                <RefreshCw className={`h-4 w-4 text-slate-400 ${typesLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="animate-fade-in shadow-soft rounded-2xl overflow-hidden border border-border/40 bg-white/50 backdrop-blur-sm">
            <DataTable
              data={filteredTypes}
              columns={typeColumns}
              isLoading={typesLoading}
              emptyMessage="No branch types found. Create one to get started."
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Branch Type Dialog */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1a1a1a]">
              {editingType ? "Edit Branch Type" : "New Branch Type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-1">
              <Label className={labelClass}>Type Name <span className="text-destructive">*</span></Label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Retail, Warehouse, Distribution"
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className={labelClass}>Description</Label>
              <Input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Brief description (optional)"
                className={inputClass}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">Active Status</p>
                <p className="text-[11px] text-muted-foreground">Inactive types won't appear in branch forms</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsTypeDialogOpen(false)} className="rounded-xl h-9">
              Cancel
            </Button>
            <Button
              onClick={handleSaveType}
              disabled={submittingType}
              className="gradient-primary text-white border-0 rounded-xl h-9 px-6 font-semibold shadow-sm hover:opacity-90"
            >
              {submittingType ? "Saving..." : editingType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

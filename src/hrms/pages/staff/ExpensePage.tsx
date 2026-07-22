import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { DataTable } from "@/hrms/components/common/DataTable";
import { expenseService } from "@/hrms/services/expenseService";
import { storeService } from "@/hrms/services/storeService";
import { expenseCategoryService, type ExpenseCategory } from "@/hrms/services/expenseCategoryService";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import { Badge } from "@/hrms/components/ui/badge";
import { toast } from "@/hrms/hooks/use-toast";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/hrms/components/ui/avatar";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Calendar,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  IndianRupee,
  Building2,
  FileUp,
  ExternalLink,
  Eye,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/hrms/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/hrms/components/ui/dropdown-menu";
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
import { useAuth } from "@/hrms/contexts/AuthContext";
import type { Expense, Store } from "@/hrms/types";
import { format } from "date-fns";

// Fallback categories if database is empty
const DEFAULT_CATEGORIES = [
  "Salary", "Rent", "Utility", "Stock Purchase", "Marketing", "Travel", "Miscellaneous"
];

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  Approved: "bg-primary/10 text-primary border-primary/20",
  Paid: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function ExpensePage() {
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dynamicCategories, setDynamicCategories] = useState<ExpenseCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isAdmin = hasPermission("manage_expenses");

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(ex => {
      if (!ex) return false;
      // Permission check: regular employees only see their own vouchers
      const creatorId = (ex.createdBy as any)?._id || (ex.createdBy as any)?.id || ex.createdBy;
      const isOwner = creatorId === user?.id;
      const canSee = isAdmin || isOwner;
      
      if (!canSee) return false;

      const matchesSearch = (ex.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ex.category || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || ex.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || ex.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [expenses, searchQuery, statusFilter, categoryFilter, user, isAdmin]);

  const categoriesToDisplay = useMemo(() => {
    const cats = dynamicCategories || [];
    return cats.length > 0 
      ? cats.map(c => c.name) 
      : DEFAULT_CATEGORIES;
  }, [dynamicCategories]);

  const stats = useMemo(() => {
    return {
      total: filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0),
      pending: filteredExpenses.filter(ex => ex.status === "Pending").length,
      approved: filteredExpenses.filter(ex => ex.status === "Approved").length,
      paid: filteredExpenses.filter(ex => ex.status === "Paid").length,
    };
  }, [filteredExpenses]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [entries, storeList, categoryList] = await Promise.all([
        expenseService.getAll(),
        storeService.getAll(),
        expenseCategoryService.getAll(),
      ]);
      setExpenses(entries || []);
      setStores(storeList?.data || []);
      setDynamicCategories(categoryList || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Use FormData for file upload support
    const submitData = new FormData();
    submitData.append("description", formData.get("description") as string);
    submitData.append("amount", formData.get("amount") as string);
    submitData.append("category", formData.get("category") as string);
    const storeId = formData.get("storeId");
    if (!storeId || storeId === "null") {
      toast({ title: "Validation Error", description: "Please select an associated store."});
      return;
    }

    submitData.append("storeId", storeId as string);
    submitData.append("paymentMethod", formData.get("paymentMethod") as string);
    submitData.append("notes", formData.get("notes") as string);
    submitData.append("date", formData.get("date") as string || new Date().toISOString());
    if (editingExpense) {
      submitData.append("status", formData.get("status") as string);
    }
    if (selectedFile) {
      submitData.append("receipt", selectedFile);
    }

    try {
      if (editingExpense) {
        const updated = await expenseService.update(editingExpense.id, submitData as any);
        setExpenses(expenses.map(ex => ex.id === editingExpense.id ? updated : ex));
        toast({ title: "Expense Updated", description: "Expense has been modified." });
      } else {
        const created = await expenseService.create(submitData as any);
        setExpenses([created, ...expenses]);
        toast({ title: "Expense Recorded", description: "New expense entry created." });
      }
      setIsDialogOpen(false);
      setEditingExpense(null);
      setSelectedFile(null);
    } catch (error) {
      toast({ title: "Error", description: "Operation failed.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await expenseService.delete(id);
      setExpenses(expenses.filter(ex => ex.id !== id));
      toast({ title: "Expense Deleted", description: "Expense entry removed from system.", variant: "destructive" });
    } catch (error) {
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
    }
  };
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const updated = await expenseService.updateStatus(id, status);
      setExpenses(expenses.map(ex => ex.id === id ? updated : ex));
      toast({ title: `Expense ${status}`, description: `Expense has been ${status.toLowerCase()}.` });
    } catch (error) {
      toast({ title: "Error", description: "Update failed.", variant: "destructive" });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await expenseCategoryService.create({ name: newCategoryName });
      setDynamicCategories([...dynamicCategories, created]);
      setNewCategoryName("");
      toast({ title: "Category Added", description: "New expense category created." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add category.", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const isConfirmed = await confirm({
      title: "Delete Category",
      description: "Are you sure you want to delete this category?",
      confirmText: "Confirm",
      cancelText: "Cancel",
      variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      await expenseCategoryService.delete(id);
      setDynamicCategories(dynamicCategories.filter(c => c.id !== id && c._id !== id));
      toast({ title: "Category Deleted", description: "Category removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete category.", variant: "destructive" });
    }
  };



  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <PageHeader
          title="Expense Management"
          subtitle="Track and manage business expenditures and employee reimbursements"
        />

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-2xl h-12 border-border/40 bg-background/50 hover:bg-background font-bold px-5">
                  <Filter className="h-4 w-4 mr-2" /> Categories
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] glass-deep border-0 rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Manage Categories</DialogTitle>
                  <DialogDescription className="font-medium text-muted-foreground text-xs">
                    Define expenditure types for organization tracking.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Category name..." 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="rounded-xl bg-background/30 border-0 h-11"
                    />
                    <Button onClick={handleAddCategory} className="rounded-xl h-11 gradient-primary">
                      Add
                    </Button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {dynamicCategories.map(cat => (
                      <div key={cat.id || cat._id} className="flex items-center justify-between p-3 bg-background/20 rounded-xl">
                        <span className="text-sm font-bold">{cat.name}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                          onClick={() => handleDeleteCategory((cat.id || cat._id)!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {dynamicCategories.length === 0 && (
                      <p className="text-center py-4 text-xs font-medium text-muted-foreground italic">
                        No custom categories yet. Using system defaults.
                      </p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingExpense(null);
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditingExpense(null)}
                className="rounded-2xl h-12 px-6 font-bold gradient-primary text-white shadow-glow hover:scale-[1.02] transition-all"
              >
                <Plus className="h-5 w-5 mr-2" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] glass-deep border-0 rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">
                  {editingExpense ? "Edit Expense Entry" : "New Expense Entry"}
                </DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground">
                  Document business spending with proper category and store attribution.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-5 pt-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Description / Purpose
                    </Label>
                    <Input
                      name="description"
                      defaultValue={editingExpense?.description}
                      placeholder="e.g. Office Stationery, Monthly Rent"
                      required
                      className="h-11 rounded-xl bg-background/30 border-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Amount (₹)
                      </Label>
                      <Input
                        name="amount"
                        type="number"
                        defaultValue={editingExpense?.amount}
                        placeholder="0.00"
                        required
                        className="h-11 rounded-xl bg-background/30 border-0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Category
                      </Label>
                      <Select name="category" defaultValue={editingExpense?.category || (categoriesToDisplay[0])}>
                        <SelectTrigger className="h-11 rounded-xl bg-background/30 border-0">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50">
                          {categoriesToDisplay.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Associated Store <span className="text-destructive">*</span>
                      </Label>
                      <Select name="storeId" defaultValue={editingExpense?.storeId as string} required>
                        <SelectTrigger className="h-11 rounded-xl bg-background/30 border-0">
                          <SelectValue placeholder="Select Store" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50">
                          {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Payment Mode
                      </Label>
                      <Select name="paymentMethod" defaultValue={editingExpense?.paymentMethod || "Cash"}>
                        <SelectTrigger className="h-11 rounded-xl bg-background/30 border-0">
                          <SelectValue placeholder="Payment Mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50">
                          {["Cash", "Card", "UPI", "Net Banking", "Cheque"].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editingExpense && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                        Status
                      </Label>
                      <Select name="status" defaultValue={editingExpense?.status}>
                        <SelectTrigger className="h-11 rounded-xl bg-background/30 border-0">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50">
                          {["Pending", "Approved", "Paid", "Rejected"].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Notes (Optional)
                    </Label>
                    <Input
                      name="notes"
                      defaultValue={editingExpense?.notes}
                      placeholder="Additional details..."
                      className="h-11 rounded-xl bg-background/30 border-0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Receipt / Document (Optional)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("receipt-upload")?.click()}
                        className="w-full h-11 rounded-xl bg-background/30 border-dashed border-2 border-primary/20 hover:border-primary/40 transition-all flex items-center justify-center gap-2"
                      >
                        <FileUp className="h-4 w-4" />
                        {selectedFile ? selectedFile.name : "Upload Receipt"}
                      </Button>
                      <input
                        id="receipt-upload"
                        type="file"
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        accept="image/*,application/pdf"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" className="w-full h-12 rounded-xl gradient-primary font-bold shadow-glow">
                    {editingExpense ? "Save Changes" : "Create Expense Entry"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Volume", value: `₹${stats.total.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pending Approval", value: stats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Approved (Unpaid)", value: stats.approved, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Paid Expenses", value: stats.paid, icon: IndianRupee, color: "text-success", bg: "bg-success/10" },
        ].map((s, i) => (
          <div key={i} className="glass-deep rounded-3xl p-5 border-0 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-all">
            <div className={`h-12 w-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className="text-xl font-black tracking-tight">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="relative flex-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-2xl bg-background/50 border-border/40 focus:bg-background transition-all"
            />
          </div>
        </div>

        <div className="w-full md:w-48">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50">
              <SelectItem value="all">All Categories</SelectItem>
              {categoriesToDisplay.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:w-48">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1.5 block">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-12 rounded-2xl bg-background/50 border-border/40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/50">
              <SelectItem value="all">All Status</SelectItem>
              {["Pending", "Approved", "Paid", "Rejected"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          onClick={() => { setSearchQuery(""); setStatusFilter("all"); setCategoryFilter("all"); }}
          className="h-12 rounded-2xl px-5 border-border/40 bg-background/50 hover:bg-background"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reset
        </Button>
      </div>

      <div className="glass-deep rounded-3xl border-0 overflow-hidden shadow-sm">
        <DataTable
          isLoading={isLoading}
          data={filteredExpenses}
          columns={[
            {
              header: "Entry Details",
              className: "py-6 pl-6",
              accessorKey: (ex) => (
                <div className="flex items-center gap-3 py-1">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <IndianRupee className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-tight truncate max-w-[150px]">{ex.description}</div>
                    <div className="text-[10px] text-muted-foreground font-black tracking-widest flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3 w-3" /> {ex.date && !isNaN(new Date(ex.date).getTime()) ? format(new Date(ex.date), "dd MMM yyyy") : "Invalid Date"}
                    </div>
                  </div>
                </div>
              ),
            },
            ...(isAdmin ? [{
              header: "Employee",
              accessorKey: (ex: any) => {
                const creator = ex.createdBy as any;
                const name = creator?.name || "System";
                const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                return (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm flex-shrink-0">
                      <AvatarImage src={creator?.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <div className="text-sm font-bold truncate max-w-[150px]">{name}</div>
                    </div>
                  </div>
                );
              },
            }] : []),
            {
              header: "Category",
              accessorKey: (ex) => (
                <Badge variant="outline" className="rounded-lg bg-muted/30 border-border/40 font-bold px-2 py-0.5 text-[10px] tracking-wider">
                  {ex.category}
                </Badge>
              ),
            },
            {
              header: "Store",
              accessorKey: (ex) => (
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground truncate max-w-[150px]">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  {(ex.storeId as any)?.name || "HQ / Internal"}
                </div>
              ),
            },
            {
              header: "Amount",
              accessorKey: (ex) => (
                <div className="font-black text-sm text-primary">
                  ₹{ex.amount.toLocaleString("en-IN")}
                </div>
              ),
            },
            {
              header: "Receipt",
              accessorKey: (ex) => (
                ex.receiptUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg text-primary hover:bg-primary/10 gap-2 font-bold text-[10px]"
                    onClick={() => window.open(ex.receiptUrl, "_blank")}
                  >
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50 font-bold">No Attachment</span>
                )
              ),
            },
            {
              header: "Status",
              accessorKey: (ex) => (
                <Badge className={`text-[10px] font-black rounded-xl px-2.5 py-1 border shadow-sm ${STATUS_COLORS[ex.status]}`}>
                  {ex.status === "Paid" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : ex.status === "Pending" ? <Clock className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  <span className="capitalize">{ex.status}</span>
                </Badge>
              ),
            },
            {
              header: <div className="sticky right-0 bg-inherit px-3 z-20 text-right">Actions</div>,
              className: "sticky right-0 bg-inherit z-10 text-right border-l border-slate-50 shadow-[-12px_0_15px_-12px_rgba(0,0,0,0.1)]",
              accessorKey: (ex) => (
                <div className="flex items-center justify-end gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
                  {isAdmin && ex.status === "Pending" && (
                    <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/40">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/20 rounded-lg transition-colors" 
                        onClick={() => handleUpdateStatus(ex.id, "Approved")}
                        title="Approve"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-600 hover:bg-rose-500/20 rounded-lg transition-colors" 
                        onClick={() => handleUpdateStatus(ex.id, "Rejected")}
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {isAdmin && ex.status === "Approved" && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-3 text-[10px] font-black border-success/30 text-success hover:bg-success/10 rounded-xl shadow-sm transition-all" 
                      onClick={() => handleUpdateStatus(ex.id, "Paid")}
                    >
                      Process Payment
                    </Button>
                  )}

                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
                      onClick={() => {
                        setEditingExpense(ex);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white border-0 rounded-[2rem] max-w-sm shadow-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-bold">
                            Delete Expense?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="font-medium text-muted-foreground">
                            This will permanently remove this expense record. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-3 mt-4">
                          <AlertDialogCancel className="rounded-xl border-gray-200 font-bold h-10">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(ex.id)}
                            className="rounded-xl bg-destructive text-white font-bold h-10 border-0 hover:bg-destructive/90 shadow-sm"
                          >
                            Confirm Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

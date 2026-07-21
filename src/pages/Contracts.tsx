import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Zap } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { usePermissions } from "@/hooks/usePermissions";
import { contractService } from "@/api/services/contract.service";
import { customerService } from "@/api/services/customer.service";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
import { useCurrency } from "@/context/CurrencyContext";

const statusColors: Record<string, string> = {
  Active:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
  Draft: "bg-muted text-muted-foreground border-border",
  Expired:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
  Signed: "bg-primary/10 text-primary border-primary/20",
};

const Contracts = () => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  useOpenCreateModal(() => setIsAddOpen(true));
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const { toast } = useToast();
  const { can } = usePermissions();
  const { formatAmount } = useCurrency();
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const filtered = useMemo(() => {
    return contracts.filter((c: any) =>
      (c.subject || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.client?.company || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [contracts, search]);

  const handleSelectAll = (checked: boolean) => {
    const pageData = filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage));
    if (checked) setSelectedContracts(pageData.map((item: any) => item._id));
    else setSelectedContracts([]);
  };

  const handleBulkAction = async () => {
    if (selectedContracts.length === 0) {
      toast({ title: "Error", description: "No items selected."});
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedContracts.map(id => contractService.deleteContract(id)));
        toast({ title: "Success", description: `Deleted ${selectedContracts.length} items.` });
        setContracts(prev => prev.filter(c => !selectedContracts.includes(c._id)));
      }
      setSelectedContracts([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch {
      toast({ title: "Error", description: "Failed to perform bulk action."});
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    client: "",
    subject: "",
    contract_value: "",
    contract_type: "",
    datestart: "",
    dateend: "",
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, clientsData] = await Promise.all([
        contractService.getContracts(),
        customerService.getAll(),
      ]);
      setContracts(contractsData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Error", description: "Failed to load contracts.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async (rows: Record<string, any>[]) => {
    setIsImporting(true);
    try {
      const result: any = await contractService.importContracts(rows);
      const count = result?.count ?? 0;
      const skipped = result?.skipped ?? 0;
      toast({
        title: count === 0 ? "No Contracts Imported" : "Import Successful",
        description: count === 0 ? "No rows matched an existing client and subject." : `Imported ${count} contract(s)${skipped ? `, skipped ${skipped} invalid row(s)` : ""}.`,
        variant: count === 0 ? "destructive" : "default",
      });
      fetchData();
    } catch (error: any) {
      toast({ title: "Import Failed", description: error?.response?.data?.message || error.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await contractService.deleteContract(id);
      setContracts((prev) => prev.filter((c) => c._id !== id));
      toast({ title: "Deleted", description: "Contract deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!formData.client || !formData.subject) {
      toast({ title: "Error", description: "Client and Subject are required.", variant: "destructive" });
      return;
    }
    try {
      const dataToSubmit = {
        ...formData,
        contract_value: Number(formData.contract_value) || 0
      };
      const newContract = await contractService.createContract(dataToSubmit);
      // refetch or append
      setContracts((prev) => [...prev, newContract]);
      toast({ title: "Created", description: "Contract created successfully." });
      setIsAddOpen(false);
      setFormData({
        client: "",
        subject: "",
        contract_value: "",
        contract_type: "",
        datestart: "",
        dateend: "",
        description: "",
      });
      fetchData(); // Refresh to get populated client
    } catch (error) {
      console.error("Create error:", error);
      toast({ title: "Error", description: "Failed to create contract.", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    try {
      const dataToSubmit = {
        subject: editItem.subject,
        contract_value: Number(editItem.contract_value) || 0,
        contract_type: editItem.contract_type,
        datestart: editItem.datestart,
        dateend: editItem.dateend,
        description: editItem.description,
      };
      const updated = await contractService.updateContract(editItem._id, dataToSubmit);
      setContracts((prev) => prev.map((c) => c._id === updated._id ? updated : c));
      toast({ title: "Updated", description: "Contract updated successfully." });
      setEditItem(null);
      fetchData(); // Refresh
    } catch (error) {
      console.error("Update error:", error);
      toast({ title: "Error", description: "Failed to update contract.", variant: "destructive" });
    }
  };

  const getStatus = (c: any) => {
    if (c.is_signed) return "Signed";
    const now = new Date();
    if (c.dateend && new Date(c.dateend) < now) return "Expired";
    return "Active";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Contracts</h1>
            <p className="text-muted-foreground">
              Manage customer contracts and agreements
            </p>
          </div>
          {can("Contracts", "Create") && (
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                  <Plus className="h-4 w-4" />
                  New Contract
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contract</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select value={formData.client} onValueChange={(val) => setFormData({ ...formData, client: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c._id} value={c._id}>{c.company || c.firstname}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Input placeholder="Contract subject" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contract Value</Label>
                      <Input type="number" placeholder="0.00" value={formData.contract_value} onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contract Type</Label>
                      <Select value={formData.contract_type} onValueChange={(val) => setFormData({ ...formData, contract_type: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fixed">Fixed Price</SelectItem>
                          <SelectItem value="Hourly">Hourly</SelectItem>
                          <SelectItem value="Retainer">Retainer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={formData.datestart} onChange={(e) => setFormData({ ...formData, datestart: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={formData.dateend} onChange={(e) => setFormData({ ...formData, dateend: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Contract description..." rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={handleCreate}>Save Contract</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Table Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50", "100", "All"].map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={bulkActionOpen} onOpenChange={(open) => {
              if (open && selectedContracts.length === 0) {
                toast({ title: "Error", description: "Please select at least one item first."});
                return;
              }
              setBulkActionOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                  <Zap className="h-3.5 w-3.5 text-primary" />
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
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setBulkActionOpen(false)} className="font-bold uppercase tracking-widest text-[10px]">Close</Button>
                  <Button onClick={handleBulkAction} disabled={isBulkLoading} className="font-bold uppercase tracking-widest text-[10px]">
                    {isBulkLoading ? "Processing..." : "Confirm"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ExportButton 
              data={filtered} 
              filename="contracts" 
              columns={[
                { header: "Title", key: "subject" },
                { header: "Customer", key: (c) => c.client?.company || c.client?.firstname || "Unknown" },
                { header: "Value", key: "contract_value" },
                { header: "Status", key: getStatus },
                { header: "Start", key: "datestart" },
                { header: "End", key: "dateend" }
              ]}
            />
            <ImportButton onData={handleImportData} loading={isImporting} />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={(() => {
                          const pageData = filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage));
                          return pageData.length > 0 && selectedContracts.length === pageData.length;
                        })()}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Start</th>
                    <th className="p-3 font-medium">End</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center p-4">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-4">No contracts found.</td></tr>
                  ) : filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage)).map((c) => (
                    <tr
                      key={c._id}
                      className={`border-b last:border-0 hover:bg-muted/50 ${selectedContracts.includes(c._id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={selectedContracts.includes(c._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedContracts(prev => [...prev, c._id]);
                            else setSelectedContracts(prev => prev.filter(id => id !== c._id));
                          }}
                        />
                      </td>
                      <td className="p-3 text-sm font-medium">{c.subject}</td>
                      <td className="p-3 text-sm">{c.client?.company || c.client?.firstname || "Unknown"}</td>
                      <td className="p-3 text-sm font-medium">
                        {formatAmount(c.contract_value || 0)}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={statusColors[getStatus(c)] || statusColors.Active}>
                          {getStatus(c)}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {c.datestart ? formatDate(c.datestart) : "-"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {c.dateend ? formatDate(c.dateend) : "-"}
                      </td>
                      <td className="p-3">
                        <TableActions
                          onView={() => window.open(`/admin/contracts/view/${c._id}`, "_blank")}
                          onEdit={
                            can("Contracts", "Edit") ? () => setEditItem(c) : undefined
                          }
                          onDelete={
                            can("Contracts", "Delete")
                              ? () => handleDelete(c._id)
                              : undefined
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
          <p className="text-xs font-bold text-muted-foreground italic">
            Showing 1 to {filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage)).length} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>
              Previous
            </Button>
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">
              1
            </div>
            <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>


      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Contract</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Customer</Label>
              <p className="text-sm font-medium text-muted-foreground px-3 py-2 rounded-lg bg-muted/40">
                {editItem.client?.company || editItem.client?.firstname || "Unknown"}
              </p>
            </div>
            <div className="space-y-2"><Label>Subject</Label><Input value={editItem.subject || ""} onChange={(e) => setEditItem({...editItem, subject: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contract Value</Label><Input type="number" value={editItem.contract_value || ""} onChange={(e) => setEditItem({...editItem, contract_value: e.target.value})} /></div>
              <div className="space-y-2">
                <Label>Contract Type</Label>
                <Select value={editItem.contract_type || ""} onValueChange={(val) => setEditItem({...editItem, contract_type: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixed">Fixed Price</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Retainer">Retainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={editItem.datestart?.substring(0, 10) || ""} onChange={(e) => setEditItem({...editItem, datestart: e.target.value})} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={editItem.dateend?.substring(0, 10) || ""} onChange={(e) => setEditItem({...editItem, dateend: e.target.value})} /></div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={editItem.description || ""} onChange={(e) => setEditItem({...editItem, description: e.target.value})} />
            </div>
            <Button className="w-full" onClick={handleUpdate}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Contracts;

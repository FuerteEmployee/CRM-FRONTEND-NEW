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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { contractService } from "@/api/services/contract.service";
import { customerService } from "@/api/services/customer.service";

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
  const [viewItem, setViewItem] = useState<any | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  const { can } = usePermissions();

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
        datestart: editItem.datestart,
        dateend: editItem.dateend,
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
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
                    <tr><td colSpan={7} className="text-center p-4">Loading...</td></tr>
                  ) : contracts.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-4">No contracts found.</td></tr>
                  ) : contracts.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="p-3 text-sm font-medium">{c.subject}</td>
                      <td className="p-3 text-sm">{c.client?.company || c.client?.firstname || "Unknown"}</td>
                      <td className="p-3 text-sm font-medium">
                        ${(c.contract_value || 0).toLocaleString()}
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
                          onView={() => setViewItem(c)}
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
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Contract Details</DialogTitle></DialogHeader>
          {viewItem && (<div className="space-y-3 pt-2"><div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm font-medium">{viewItem.subject}</p></div>
            <div><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm">{viewItem.client?.company || "Unknown"}</p></div>
            <div><p className="text-xs text-muted-foreground">Value</p><p className="text-sm font-medium">${(viewItem.contract_value || 0).toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={statusColors[getStatus(viewItem)]}>{getStatus(viewItem)}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Start Date</p><p className="text-sm">{viewItem.datestart ? formatDate(viewItem.datestart) : "-"}</p></div>
            <div><p className="text-xs text-muted-foreground">End Date</p><p className="text-sm">{viewItem.dateend ? formatDate(viewItem.dateend) : "-"}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Contract</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2"><Label>Subject</Label><Input value={editItem.subject || ""} onChange={(e) => setEditItem({...editItem, subject: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contract Value</Label><Input type="number" value={editItem.contract_value || ""} onChange={(e) => setEditItem({...editItem, contract_value: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={editItem.datestart?.substring(0, 10) || ""} onChange={(e) => setEditItem({...editItem, datestart: e.target.value})} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={editItem.dateend?.substring(0, 10) || ""} onChange={(e) => setEditItem({...editItem, dateend: e.target.value})} /></div>
            </div>
            <Button className="w-full" onClick={handleUpdate}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Contracts;

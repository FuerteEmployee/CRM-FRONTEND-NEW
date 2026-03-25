import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";

type CreditNote = { id: string; invoice: string; customer: string; amount: number; reason: string; status: string; date: string };

const creditNotes: CreditNote[] = [
  { id: "CN-001", invoice: "INV-0041", customer: "Stark Industries", amount: 1200, reason: "Overcharge on consulting hours", status: "Applied", date: "2026-03-04" },
  { id: "CN-002", invoice: "INV-0038", customer: "Acme Corp", amount: 500, reason: "Discount adjustment", status: "Pending", date: "2026-03-06" },
];

const statusColors: Record<string, string> = { Applied: "bg-success/10 text-success border-success/20", Pending: "bg-warning/10 text-warning border-warning/20", Void: "bg-muted text-muted-foreground" };

const CreditNotes = () => {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<CreditNote | null>(null);
  const [editItem, setEditItem] = useState<CreditNote | null>(null);
  const { toast } = useToast();
  const filtered = creditNotes.filter((c) => c.customer.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Credit Notes</h1><p className="text-muted-foreground">Manage credit notes and adjustments</p></div>
          <Dialog><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Credit Note</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Create Credit Note</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Invoice</Label><Input placeholder="Invoice number" /></div>
                  <div className="space-y-2"><Label>Customer</Label><Input placeholder="Customer" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Amount</Label><Input type="number" placeholder="0.00" /></div>
                  <div className="space-y-2"><Label>Status</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Applied">Applied</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Void">Void</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Reason for credit note" /></div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
                <Button className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3 font-medium">ID</th><th className="p-3 font-medium">Invoice</th><th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">Amount</th><th className="p-3 font-medium">Reason</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Actions</th></tr></thead>
              <tbody>{filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-3 text-sm font-mono">{c.id}</td><td className="p-3 text-sm">{c.invoice}</td><td className="p-3 text-sm text-muted-foreground">{c.customer}</td><td className="p-3 text-sm font-medium">${c.amount.toLocaleString()}</td><td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">{c.reason}</td><td className="p-3"><Badge variant="outline" className={`text-xs ${statusColors[c.status]}`}>{c.status}</Badge></td><td className="p-3 text-sm text-muted-foreground">{formatDate(c.date)}</td>
                  <td className="p-3"><TableActions onView={() => setViewItem(c)} onEdit={() => setEditItem(c)} onDelete={() => toast({ title: "Deleted", description: `Credit note ${c.id} deleted.` })} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent></Card>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Credit Note Details</DialogTitle></DialogHeader>
          {viewItem && (<div className="space-y-3 pt-2"><div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">ID</p><p className="text-sm font-medium">{viewItem.id}</p></div>
            <div><p className="text-xs text-muted-foreground">Invoice</p><p className="text-sm">{viewItem.invoice}</p></div>
            <div><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm">{viewItem.customer}</p></div>
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-medium">${viewItem.amount.toLocaleString()}</p></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground">Reason</p><p className="text-sm">{viewItem.reason}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={`text-xs ${statusColors[viewItem.status]}`}>{viewItem.status}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{formatDate(viewItem.date)}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Credit Note</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Invoice</Label><Input defaultValue={editItem.invoice} /></div>
              <div className="space-y-2"><Label>Customer</Label><Input defaultValue={editItem.customer} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount</Label><Input type="number" defaultValue={editItem.amount} /></div>
              <div className="space-y-2"><Label>Status</Label><Select defaultValue={editItem.status}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Applied">Applied</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Void">Void</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Reason</Label><Textarea defaultValue={editItem.reason} /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" defaultValue={editItem.date} /></div>
            <Button className="w-full" onClick={() => { setEditItem(null); toast({ title: "Updated", description: "Credit note updated." }); }}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CreditNotes;

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

type Estimate = { id: string; title: string; customer: string; amount: number; status: string; date: string };

const estimates: Estimate[] = [
  { id: "EST-001", title: "Website Development", customer: "Acme Corp", amount: 25000, status: "Accepted", date: "2026-02-20" },
  { id: "EST-002", title: "Mobile App", customer: "Globex Inc", amount: 80000, status: "Sent", date: "2026-03-01" },
  { id: "EST-003", title: "SEO Package", customer: "Stark Industries", amount: 12000, status: "Draft", date: "2026-03-03" },
];

const statusColors: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-info/10 text-info border-info/20",
  Expired: "bg-warning/10 text-warning border-warning/20",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
  Accepted: "bg-success/10 text-success border-success/20",
};

const Estimates = () => {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<Estimate | null>(null);
  const [editItem, setEditItem] = useState<Estimate | null>(null);
  const { toast } = useToast();
  const filtered = estimates.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Estimates</h1><p className="text-muted-foreground">Manage estimate documents</p></div>
          <Dialog>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Estimate</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Estimate</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>ID</Label><Input placeholder="EST-000" /></div>
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Estimate title" /></div>
                <div className="space-y-2"><Label>Customer</Label><Input placeholder="Customer name" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Amount</Label><Input type="number" placeholder="0.00" /></div>
                  <div className="space-y-2"><Label>Status</Label>
                    <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Sent">Sent</SelectItem><SelectItem value="Accepted">Accepted</SelectItem><SelectItem value="Declined">Declined</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
                <Button className="w-full">Create Estimate</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search estimates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3 font-medium">ID</th><th className="p-3 font-medium">Title</th><th className="p-3 font-medium">Customer</th><th className="p-3 font-medium">Amount</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Actions</th></tr></thead>
              <tbody>{filtered.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-3 text-sm font-mono">{e.id}</td><td className="p-3 text-sm font-medium">{e.title}</td><td className="p-3 text-sm text-muted-foreground">{e.customer}</td><td className="p-3 text-sm">${e.amount.toLocaleString()}</td><td className="p-3"><Badge variant="outline" className={`text-xs ${statusColors[e.status]}`}>{e.status}</Badge></td><td className="p-3 text-sm text-muted-foreground">{formatDate(e.date)}</td>
                  <td className="p-3"><TableActions onView={() => setViewItem(e)} onEdit={() => setEditItem(e)} onDelete={() => toast({ title: "Deleted", description: `Estimate ${e.id} deleted.` })} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="p-3 text-sm text-muted-foreground">Showing 1 to {filtered.length} of {filtered.length} entries</div>
        </CardContent></Card>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Estimate Details</DialogTitle></DialogHeader>
          {viewItem && (<div className="space-y-3 pt-2"><div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">ID</p><p className="text-sm font-medium">{viewItem.id}</p></div>
            <div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm font-medium">{viewItem.title}</p></div>
            <div><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm">{viewItem.customer}</p></div>
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm">${viewItem.amount.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={`text-xs ${statusColors[viewItem.status]}`}>{viewItem.status}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{formatDate(viewItem.date)}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Estimate</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Title</Label><Input defaultValue={editItem.title} /></div>
            <div className="space-y-2"><Label>Customer</Label><Input defaultValue={editItem.customer} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount</Label><Input type="number" defaultValue={editItem.amount} /></div>
              <div className="space-y-2"><Label>Status</Label><Select defaultValue={editItem.status}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Sent">Sent</SelectItem><SelectItem value="Accepted">Accepted</SelectItem><SelectItem value="Declined">Declined</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" defaultValue={editItem.date} /></div>
            <Button className="w-full" onClick={() => { setEditItem(null); toast({ title: "Updated", description: "Estimate updated." }); }}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Estimates;

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
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";

type Item = { id: string; name: string; description: string; rate: number; unit: string; taxable: boolean };

const items: Item[] = [
  { id: "ITEM-001", name: "Web Development", description: "Full-stack web development services", rate: 150, unit: "hour", taxable: true },
  { id: "ITEM-002", name: "UI/UX Design", description: "User interface and experience design", rate: 125, unit: "hour", taxable: true },
  { id: "ITEM-003", name: "Consulting", description: "Technical consulting services", rate: 200, unit: "hour", taxable: true },
  { id: "ITEM-004", name: "Server Hosting", description: "Monthly cloud server hosting", rate: 99, unit: "month", taxable: false },
  { id: "ITEM-005", name: "QA Testing", description: "Quality assurance and testing", rate: 100, unit: "hour", taxable: true },
];

const Items = () => {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const { toast } = useToast();
  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Items</h1><p className="text-muted-foreground">Manage billable items and services</p></div>
          <Dialog><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Item</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Create Item</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>ID</Label><Input placeholder="ITEM-000" /></div>
                <div className="space-y-2"><Label>Name</Label><Input placeholder="Item name" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Description" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Rate</Label><Input type="number" placeholder="0.00" /></div>
                  <div className="space-y-2"><Label>Unit</Label><Input placeholder="hour, month, etc." /></div>
                </div>
                <div className="space-y-2"><Label>Taxable</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select>
                </div>
                <Button className="w-full">Create Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search items..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3 font-medium">ID</th><th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Description</th><th className="p-3 font-medium">Rate</th><th className="p-3 font-medium">Unit</th><th className="p-3 font-medium">Taxable</th><th className="p-3 font-medium">Actions</th></tr></thead>
              <tbody>{filtered.map((i) => (
                <tr key={i.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="p-3 text-sm font-mono">{i.id}</td><td className="p-3 text-sm font-medium">{i.name}</td><td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">{i.description}</td><td className="p-3 text-sm font-medium">${i.rate}</td><td className="p-3 text-sm text-muted-foreground">per {i.unit}</td>
                  <td className="p-3"><Badge variant="outline" className={i.taxable ? "bg-success/10 text-success border-success/20 text-xs" : "text-xs"}>{i.taxable ? "Yes" : "No"}</Badge></td>
                  <td className="p-3"><TableActions onView={() => setViewItem(i)} onEdit={() => setEditItem(i)} onDelete={() => toast({ title: "Deleted", description: `Item ${i.id} deleted.` })} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </CardContent></Card>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Item Details</DialogTitle></DialogHeader>
          {viewItem && (<div className="space-y-3 pt-2"><div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">ID</p><p className="text-sm font-medium">{viewItem.id}</p></div>
            <div><p className="text-xs text-muted-foreground">Name</p><p className="text-sm font-medium">{viewItem.name}</p></div>
            <div className="col-span-2"><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{viewItem.description}</p></div>
            <div><p className="text-xs text-muted-foreground">Rate</p><p className="text-sm">${viewItem.rate}</p></div>
            <div><p className="text-xs text-muted-foreground">Unit</p><p className="text-sm">per {viewItem.unit}</p></div>
            <div><p className="text-xs text-muted-foreground">Taxable</p><p className="text-sm">{viewItem.taxable ? "Yes" : "No"}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Name</Label><Input defaultValue={editItem.name} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea defaultValue={editItem.description} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Rate</Label><Input type="number" defaultValue={editItem.rate} /></div>
              <div className="space-y-2"><Label>Unit</Label><Input defaultValue={editItem.unit} /></div>
            </div>
            <div className="space-y-2"><Label>Taxable</Label><Select defaultValue={editItem.taxable ? "yes" : "no"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
            <Button className="w-full" onClick={() => { setEditItem(null); toast({ title: "Updated", description: "Item updated." }); }}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Items;

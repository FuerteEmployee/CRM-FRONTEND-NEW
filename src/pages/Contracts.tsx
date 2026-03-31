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
import { contracts, type Contract } from "@/data/mockData";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";

const statusColors: Record<string, string> = {
  Active:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
  Draft: "bg-muted text-muted-foreground border-border",
  Expired:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
  Signed: "bg-primary/10 text-primary border-primary/20",
};

const Contracts = () => {
  const [viewItem, setViewItem] = useState<Contract | null>(null);
  const [editItem, setEditItem] = useState<Contract | null>(null);
  const { toast } = useToast();
  const { can } = usePermissions();

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
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Contract
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contract</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox id="trash" />
                      <Label htmlFor="trash" className="font-normal">
                        Trash
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="hide-customer" />
                      <Label htmlFor="hide-customer" className="font-normal">
                        Hide from customer
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acme">Acme Corp</SelectItem>
                        <SelectItem value="techco">TechCo</SelectItem>
                        <SelectItem value="globex">Globex Inc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="Contract subject" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Contract Value</Label>
                      <Input type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Contract Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Price</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="retainer">Retainer</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Contract description..." rows={3} />
                  </div>
                  <Button className="w-full">Save</Button>
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
                  {contracts.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="p-3 text-sm font-medium">{c.title}</td>
                      <td className="p-3 text-sm">{c.customer}</td>
                      <td className="p-3 text-sm font-medium">
                        ${c.value.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={statusColors[c.status]}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {formatDate(c.startDate)}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {formatDate(c.endDate)}
                      </td>
                      <td className="p-3">
                        <TableActions
                          onView={() => setViewItem(c)}
                          onEdit={
                            can("Contracts", "Edit") ? () => setEditItem(c) : undefined
                          }
                          onDelete={
                            can("Contracts", "Delete")
                              ? () =>
                                  toast({
                                    title: "Deleted",
                                    description: `Contract deleted.`,
                                  })
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
            <div><p className="text-xs text-muted-foreground">Title</p><p className="text-sm font-medium">{viewItem.title}</p></div>
            <div><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm">{viewItem.customer}</p></div>
            <div><p className="text-xs text-muted-foreground">Value</p><p className="text-sm font-medium">${viewItem.value.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={statusColors[viewItem.status]}>{viewItem.status}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Start Date</p><p className="text-sm">{formatDate(viewItem.startDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">End Date</p><p className="text-sm">{formatDate(viewItem.endDate)}</p></div>
          </div></div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Contract</DialogTitle></DialogHeader>
          {editItem && (<div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="edit-trash" />
                <Label htmlFor="edit-trash" className="font-normal">Trash</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="edit-hide-customer" />
                <Label htmlFor="edit-hide-customer" className="font-normal">Hide from customer</Label>
              </div>
            </div>
            <div className="space-y-2"><Label>Customer</Label>
              <Select defaultValue={editItem.customer}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Acme Corp">Acme Corp</SelectItem><SelectItem value="TechCo">TechCo</SelectItem><SelectItem value="Globex Inc">Globex Inc</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Subject</Label><Input defaultValue={editItem.title} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contract Value</Label><Input type="number" defaultValue={editItem.value} /></div>
              <div className="space-y-2"><Label>Contract Type</Label>
                <Select><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed Price</SelectItem><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="retainer">Retainer</SelectItem><SelectItem value="milestone">Milestone</SelectItem></SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" defaultValue={editItem.startDate} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" defaultValue={editItem.endDate} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Contract description..." rows={3} /></div>
            <Button className="w-full" onClick={() => { setEditItem(null); toast({ title: "Updated", description: "Contract updated." }); }}>Save Changes</Button>
          </div>)}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Contracts;

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
import { Plus, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  Active:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
  Cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400",
  Expired: "bg-muted text-muted-foreground border-border",
};

const Subscriptions = () => {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: salesService.getSubscriptions,
  });

  const filtered = subscriptions.filter((s: any) =>
    (s.customer || s.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage recurring customer subscriptions
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Subscription
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subscription</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Billing Plan</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" placeholder="1" />
                  </div>
                  <div className="space-y-2">
                    <Label>First Billing Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subscription Name</Label>
                  <Input placeholder="Subscription name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Subscription description" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="include-desc" />
                  <Label htmlFor="include-desc" className="font-normal">
                    Include description in invoice item
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input placeholder="Search customer..." />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tax 1 (Stripe)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Tax</SelectItem>
                        <SelectItem value="gst">GST</SelectItem>
                        <SelectItem value="vat">VAT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tax 2 (Stripe)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tax" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Tax</SelectItem>
                        <SelectItem value="gst">GST</SelectItem>
                        <SelectItem value="vat">VAT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Terms & Conditions</Label>
                  <Textarea placeholder="Enter terms & conditions" rows={3} />
                </div>
                <Button className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              className="pl-9"
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
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Plan</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Start Date</th>
                    <th className="p-3 font-medium">Next Billing</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-6 w-16" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-8 w-16" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s: any) => (
                      <tr
                        key={s._id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="p-3 text-sm font-medium">
                          {s.customer || s.name || "Untitled"}
                        </td>
                        <td className="p-3 text-sm">{s.plan || s.billing_plan}</td>
                        <td className="p-3 text-sm">
                          ${(s.amount || s.total || 0).toLocaleString()}/mo
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={statusColors[s.status] || statusColors["Expired"]}
                          >
                            {s.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {s.startDate || s.date ? formatDate(s.startDate || s.date) : "-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {s.next_billing_cycle ? formatDate(s.next_billing_cycle) : "-"}
                        </td>
                        <td className="p-3">
                          <TableActions
                            onView={() => setViewItem(s)}
                            onEdit={() => setEditItem(s)}
                            onDelete={() =>
                              toast({
                                title: "Info",
                                description: `Delete triggered for ${s._id}`,
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm font-medium">{viewItem.customer || viewItem.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-sm">{viewItem.plan || viewItem.billing_plan}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm">
                    ${(viewItem.amount || viewItem.total || 0).toLocaleString()}/mo
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={
                      statusColors[viewItem.status] || statusColors["Expired"]
                    }
                  >
                    {viewItem.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm">
                    {viewItem.startDate || viewItem.date ? formatDate(viewItem.startDate || viewItem.date) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next Billing</p>
                  <p className="text-sm">
                    {viewItem.next_billing_cycle ? formatDate(viewItem.next_billing_cycle) : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Subscriptions;

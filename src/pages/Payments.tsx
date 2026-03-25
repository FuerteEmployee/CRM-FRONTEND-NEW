import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: "Pending", color: "bg-info/10 text-info border-info/20" },
  2: { label: "Completed", color: "bg-success/10 text-success border-success/20" },
  3: { label: "Partial", color: "bg-warning/10 text-warning border-warning/20" },
  4: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const Payments = () => {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: salesService.getPayments,
  });

  const filtered = payments.filter(
    (p: any) =>
      (p.invoiceid || "").toLowerCase().includes(search.toLowerCase()) ||
      (p._id || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalReceived = payments
    .filter((p: any) => p.status === 2)
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const totalPending = payments
    .filter((p: any) => p.status === 1)
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Payments</h1>
            <p className="text-muted-foreground">Track all payment transactions</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment ID</Label>
                    <Input placeholder="PAY-000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice</Label>
                    <Input placeholder="INV-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input placeholder="Customer name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="PayPal">PayPal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select defaultValue="1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Pending</SelectItem>
                        <SelectItem value="2">Completed</SelectItem>
                        <SelectItem value="3">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" />
                  </div>
                </div>
                <Button className="w-full">Record Payment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-stagger">
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${totalReceived.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Received</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${totalPending.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {payments.filter((p: any) => p.status === 2).length}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-lift">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <AlertCircle className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{payments.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">ID</th>
                    <th className="p-3 font-medium">Invoice</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Method</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-8 w-16" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No payments found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p: any) => {
                      const status = statusMap[p.status] || statusMap[1];
                      return (
                        <tr
                          key={p._id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3 text-sm font-mono">{p._id.substring(0, 8)}</td>
                          <td className="p-3 text-sm">{p.invoiceid || "N/A"}</td>
                          <td className="p-3 text-sm font-medium">
                            ${(p.amount || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {p.paymentmode || "Bank Transfer"}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {p.date ? formatDate(p.date) : "-"}
                          </td>
                          <td className="p-3">
                            <TableActions
                              onView={() => setViewItem(p)}
                              onEdit={() => setEditItem(p)}
                              onDelete={() =>
                                toast({
                                  title: "Info",
                                  description: `Delete triggered for ${p._id}`,
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
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
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">ID</p>
                  <p className="text-sm font-medium">{viewItem._id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <p className="text-sm">{viewItem.invoiceid}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-medium">
                    ${(viewItem.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="text-sm">{viewItem.paymentmode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusMap[viewItem.status]?.color || ""}`}
                  >
                    {statusMap[viewItem.status]?.label || "Unknown"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm">{viewItem.date ? formatDate(viewItem.date) : "-"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Payments;

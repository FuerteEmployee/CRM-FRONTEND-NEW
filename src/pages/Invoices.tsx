import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { financeService } from "@/api/services/finance.service";
import { customerService } from "@/api/services/customer.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: "Unpaid", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  2: { label: "Paid", color: "bg-green-50 text-green-700 border-green-200" },
  3: { label: "Partially Paid", color: "bg-blue-50 text-blue-700 border-blue-200" },
  4: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200" },
  5: { label: "Cancelled", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

const Invoices = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["invoices"],
    queryFn: salesService.getInvoices,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });

  const { data: taxes = [] } = useQuery<any[]>({
    queryKey: ["taxes"],
    queryFn: financeService.getTaxes,
  });

  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
  });

  const { data: paymentModes = [] } = useQuery<any[]>({
    queryKey: ["payment-modes"],
    queryFn: financeService.getPaymentModes,
  });

  const filtered = invoices.filter((i: any) => {
    const match =
      (i.number || "").toLowerCase().includes(search.toLowerCase()) ||
      (i._id || "").toLowerCase().includes(search.toLowerCase());
    const statusLabel = statusMap[i.status]?.label || "";
    const matchStatus = statusFilter === "all" || statusLabel === statusFilter;
    return match && matchStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">Create and manage invoices</p>
          </div>
          {can("Invoices", "Create") && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Invoice Number</Label>
                    <Input placeholder="INV-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c: any) => (
                          <SelectItem key={c._id} value={c._id}>{c.company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Invoice description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select defaultValue="1">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Unpaid</SelectItem>
                          <SelectItem value="2">Paid</SelectItem>
                          <SelectItem value="3">Partially Paid</SelectItem>
                          <SelectItem value="4">Overdue</SelectItem>
                          <SelectItem value="5">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select defaultValue={currencies.find((c: any) => c.isdefault)?._id}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c: any) => (
                            <SelectItem key={c._id} value={c._id}>{c.name} ({c.symbol})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tax</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="No Tax" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Tax</SelectItem>
                          {taxes.map((t: any) => (
                            <SelectItem key={t._id} value={t._id}>{t.name} ({t.taxrate}%)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentModes.filter((m: any) => m.active && !m.expenses_only).map((mode: any) => (
                          <SelectItem key={mode._id} value={mode._id}>{mode.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full">Create Invoice</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Partially Paid">Partially Paid</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Invoice</th>
                    <th className="p-3 font-medium">Customer ID</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Issue Date</th>
                    <th className="p-3 font-medium">Due Date</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="p-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-8 w-16" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No invoices found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((inv: any) => {
                      const status = statusMap[inv.status] || statusMap[1];
                      return (
                        <tr
                          key={inv._id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-3 text-sm font-medium">
                            {inv.number || `INV-${inv._id.substring(0, 6)}`}
                          </td>
                          <td className="p-3 text-sm">{inv.clientid || "N/A"}</td>
                          <td className="p-3 text-sm font-medium">
                            ₹{(inv.total || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={status.color}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {inv.date ? formatDate(inv.date) : "-"}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {inv.duedate ? formatDate(inv.duedate) : "-"}
                          </td>
                          <td className="p-3">
                            <TableActions
                              onView={() => setViewItem(inv)}
                              onEdit={can("Invoices", "Edit") ? () => setEditItem(inv) : undefined}
                              onDelete={
                                can("Invoices", "Delete")
                                  ? () =>
                                      toast({
                                        title: "Info",
                                        description: `Delete triggered for ${inv._id}`,
                                      })
                                  : undefined
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

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice</p>
                  <p className="text-sm font-medium">
                    {viewItem.number || `INV-${viewItem._id.substring(0, 6)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer ID</p>
                  <p className="text-sm font-medium">
                    {viewItem.clientid || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-medium">
                    ₹{(viewItem.total || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={statusMap[viewItem.status]?.color}
                  >
                    {statusMap[viewItem.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Issue Date</p>
                  <p className="text-sm">{viewItem.date ? formatDate(viewItem.date) : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm">{viewItem.duedate ? formatDate(viewItem.duedate) : "-"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Invoices;

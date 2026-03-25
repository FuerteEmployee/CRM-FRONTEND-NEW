import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { financeService } from "@/api/services/finance.service";
import { Skeleton } from "@/components/ui/skeleton";

const categoryColors: Record<string, string> = {
  Software: "bg-primary/10 text-primary",
  Hardware:
    "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Travel: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Marketing:
    "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  Office: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  Other: "bg-muted text-muted-foreground",
};

const Expenses = () => {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["expenses"],
    queryFn: salesService.getExpenses,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["expense-categories"],
    queryFn: financeService.getExpenseCategories,
  });

  const { data: paymentModes = [] } = useQuery<any[]>({
    queryKey: ["payment-modes"],
    queryFn: financeService.getPaymentModes,
  });

  const filtered = expenses.filter((e: any) => {
    const match = (e.description || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchCat = catFilter === "all" || e.category === catFilter;
    return match && matchCat;
  });

  const total = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  // Group by category for chart
  const expenseByCategory = Object.entries(
    expenses.reduce((acc: any, e: any) => {
      const cat = e.category || "Other";
      acc[cat] = (acc[cat] || 0) + (e.amount || 0);
      return acc;
    }, {}),
  ).map(([category, amount]) => ({ category, amount }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Expenses</h1>
            <p className="text-muted-foreground">
              Track and manage team expenses
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Attach Receipt</Label>
                  <Input type="file" accept="image/*,.pdf" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="recurring" />
                  <Label htmlFor="recurring" className="font-normal">
                    Recurring
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="Expense name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference #</Label>
                    <Input placeholder="Reference number" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea placeholder="Add a note..." rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Expense Category</Label>
                  <div className="flex gap-2">
                    <Select>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expense Date</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.filter((m: any) => m.active && !m.invoices_only).map((mode: any) => (
                        <SelectItem key={mode._id} value={mode._id}>{mode.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">
                Total Expenses
              </p>
              <p className="text-2xl font-bold mt-1">
                ${total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expenseByCategory}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        dataKey="category"
                        tick={{ fill: "hsl(215,16%,47%)", fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: "hsl(215,16%,47%)", fontSize: 12 }}
                        tickFormatter={(v: number) => `$${v / 1000}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`]}
                      />
                      <Bar
                        dataKey="amount"
                        fill="hsl(213, 44%, 25%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat._id} value={cat.name}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Amount</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3">
                          <Skeleton className="h-4 w-48" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-8 w-16" />
                        </td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No expenses found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e: any) => (
                      <tr
                        key={e._id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="p-3 text-sm font-medium">
                          {e.description || e.name || "Untitled Expense"}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              categoryColors[e.category] ||
                              categoryColors["Other"]
                            }
                          >
                            {e.category || "Other"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {e.date ? formatDate(e.date) : "-"}
                        </td>
                        <td className="p-3 text-sm font-medium">
                          ${(e.amount || 0).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <TableActions
                            onView={() => setViewItem(e)}
                            onEdit={() => setEditItem(e)}
                            onDelete={() =>
                              toast({
                                title: "Info",
                                description: `Delete triggered for ${e._id}`,
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
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm font-medium">
                    {viewItem.description || viewItem.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge
                    variant="outline"
                    className={
                      categoryColors[viewItem.category] ||
                      categoryColors["Other"]
                    }
                  >
                    {viewItem.category || "Other"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm">
                    {viewItem.date ? formatDate(viewItem.date) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-sm font-medium">
                    ${(viewItem.amount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Note</p>
                  <p className="text-sm">{viewItem.note || "No notes."}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Expenses;

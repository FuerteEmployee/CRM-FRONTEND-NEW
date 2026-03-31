import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Upload,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { Link } from "react-router-dom";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";

const Customers = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const itemsPerPage = 25;

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery<any[]>({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: customerService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Deleted",
        description: "Customer deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const filtered = customers.filter((c) => {
    const matchSearch = (c.company || "")
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (c.active ? "Active" : "Inactive") === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedCustomers = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.active).length;
  const inactiveCustomers = customers.filter((c) => !c.active).length;
  const activeContacts = 0;
  const inactiveContacts = 0;
  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Success",
        description: "Customer created successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Updated",
        description: "Customer updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  const [newCustomer, setNewCustomer] = useState<any>({
    company: "",
    active: true,
  });

  const handleCreate = () => {
    if (!newCustomer.company) {
      toast({
        title: "Warning",
        description: "Company name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newCustomer);
    setNewCustomer({ company: "", active: true });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <Link to="#" className="text-sm text-primary hover:underline">
            Contacts →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-t-2 border-t-border">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{totalCustomers}</p>
              <p className="text-xs text-muted-foreground">Total Customers</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-primary">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {activeCustomers}
              </p>
              <p className="text-xs text-primary">Active Customers</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-destructive">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-destructive">
                {inactiveCustomers}
              </p>
              <p className="text-xs text-destructive">Inactive Customers</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-green-500">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-600">
                {activeContacts}
              </p>
              <p className="text-xs text-green-600">Active Contacts</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-destructive">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-destructive">
                {inactiveContacts}
              </p>
              <p className="text-xs text-destructive">Inactive Contacts</p>
            </CardContent>
          </Card>
          <Card className="border-t-2 border-t-muted-foreground">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">0</p>
              <p className="text-xs text-muted-foreground">
                Contacts Logged In
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2">
            {can("Customers", "Create") && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Customer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                  </DialogHeader>
                  <Tabs defaultValue="details" className="pt-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="details">Customer Details</TabsTrigger>
                      <TabsTrigger value="billing">
                        Billing & Shipping
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="details" className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>
                          Company <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder="Company name"
                          value={newCustomer.company}
                          onChange={(e) =>
                            setNewCustomer({
                              ...newCustomer,
                              company: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>VAT Number</Label>
                          <Input
                            placeholder="VAT number"
                            value={newCustomer.vat}
                            onChange={(e) =>
                              setNewCustomer({
                                ...newCustomer,
                                vat: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            type="tel"
                            placeholder="+1 555-0100"
                            value={newCustomer.phonenumber}
                            onChange={(e) =>
                              setNewCustomer({
                                ...newCustomer,
                                phonenumber: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input type="url" placeholder="https://example.com" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Groups</Label>
                          <div className="flex gap-2">
                            <Select>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Enterprise">
                                  Enterprise
                                </SelectItem>
                                <SelectItem value="VIP">VIP</SelectItem>
                                <SelectItem value="SMB">SMB</SelectItem>
                                <SelectItem value="Startup">Startup</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
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
                              <SelectItem value="AUD">AUD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Default Language</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Textarea placeholder="Full address" rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input placeholder="City" />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input placeholder="State" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Zip Code</Label>
                          <Input placeholder="Zip code" />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="UK">United Kingdom</SelectItem>
                              <SelectItem value="IN">India</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                              <SelectItem value="AU">Australia</SelectItem>
                              <SelectItem value="DE">Germany</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="billing" className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-sm">
                            Billing Address
                          </h3>
                          <div className="space-y-2">
                            <Label>Street</Label>
                            <Textarea placeholder="Street address" rows={2} />
                          </div>
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input placeholder="City" />
                          </div>
                          <div className="space-y-2">
                            <Label>State</Label>
                            <Input placeholder="State" />
                          </div>
                          <div className="space-y-2">
                            <Label>Zip Code</Label>
                            <Input placeholder="Zip code" />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="UK">United Kingdom</SelectItem>
                                <SelectItem value="IN">India</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="AU">Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="font-semibold text-sm">
                            Shipping Address
                          </h3>
                          <div className="space-y-2">
                            <Label>Street</Label>
                            <Textarea placeholder="Street address" rows={2} />
                          </div>
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input placeholder="City" />
                          </div>
                          <div className="space-y-2">
                            <Label>State</Label>
                            <Input placeholder="State" />
                          </div>
                          <div className="space-y-2">
                            <Label>Zip Code</Label>
                            <Input placeholder="Zip code" />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="UK">United Kingdom</SelectItem>
                                <SelectItem value="IN">India</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="AU">Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Same as Customer Info
                        </Button>
                        <Button variant="outline" size="sm">
                          Copy Billing Address
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <div className="flex gap-2 pt-2">
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleCreate}
                      >
                        Save and Create Contact
                      </Button>
                    </DialogTrigger>
                    <DialogTrigger asChild>
                      <Button className="flex-1" onClick={handleCreate}>
                        Save
                      </Button>
                    </DialogTrigger>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {can("Customers", "Create") && (
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import Customers
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <Select defaultValue="25">
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Export
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  Bulk Actions
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 w-[200px] text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                      />
                    </th>
                    <th className="p-3 font-medium">#</th>
                    <th className="p-3 font-medium">Company ↕</th>
                    <th className="p-3 font-medium">Primary Contact</th>
                    <th className="p-3 font-medium">Primary Email</th>
                    <th className="p-3 font-medium">Phone</th>
                    <th className="p-3 font-medium">Active</th>
                    <th className="p-3 font-medium">Groups</th>
                    <th className="p-3 font-medium">Date Created</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={10} className="p-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-10 text-center text-muted-foreground"
                      >
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((c, i) => (
                      <tr
                        key={c._id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                          />
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {(currentPage - 1) * itemsPerPage + i + 1}
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium">
                            {c.company}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {"-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {"-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {c.phonenumber}
                        </td>
                         <td className="p-3">
                           <Switch
                             checked={c.active}
                             disabled={!can("Customers", "Edit")}
                             onCheckedChange={(val) =>
                               updateMutation.mutate({
                                 id: c._id || "",
                                 data: { active: val },
                               })
                             }
                             className="scale-75"
                           />
                         </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {c.groups?.map((g) => (
                              <Badge
                                key={g}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {g}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {"-"}
                        </td>
                         <td className="p-3">
                           <TableActions
                             onView={() => setViewItem(c)}
                             onEdit={can("Customers", "Edit") ? () => setEditItem(c) : undefined}
                             onDelete={can("Customers", "Delete") ? () => deleteMutation.mutate(c._id || "") : undefined}
                           />
                         </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-3 border-t text-sm text-muted-foreground">
              <span>
                Showing 1 to {Math.min(itemsPerPage, filtered.length)} of{" "}
                {filtered.length} entries
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i + 1}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm font-medium">{viewItem.company}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm">{viewItem.phonenumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <p className="text-sm">{viewItem.website || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm">
                    {viewItem.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="text-sm">{viewItem.city || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Country</p>
                  <p className="text-sm">{viewItem.country || "-"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editItem && (
            <Tabs defaultValue="details" className="pt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Customer Details</TabsTrigger>
                <TabsTrigger value="billing">Billing & Shipping</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>
                    Company <span className="text-destructive">*</span>
                  </Label>
                  <Input defaultValue={editItem.company} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>VAT Number</Label>
                    <Input placeholder="VAT number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" defaultValue={editItem.phone} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input type="url" placeholder="https://example.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Groups</Label>
                    <div className="flex gap-2">
                      <Select>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Enterprise">Enterprise</SelectItem>
                          <SelectItem value="VIP">VIP</SelectItem>
                          <SelectItem value="SMB">SMB</SelectItem>
                          <SelectItem value="Startup">Startup</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
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
                        <SelectItem value="AUD">AUD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea placeholder="Full address" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input placeholder="State" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Zip Code</Label>
                    <Input placeholder="Zip code" />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="IN">India</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="billing" className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Billing Address</h3>
                    <div className="space-y-2">
                      <Label>Street</Label>
                      <Textarea placeholder="Street address" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input placeholder="State" />
                    </div>
                    <div className="space-y-2">
                      <Label>Zip Code</Label>
                      <Input placeholder="Zip code" />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Shipping Address</h3>
                    <div className="space-y-2">
                      <Label>Street</Label>
                      <Textarea placeholder="Street address" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input placeholder="City" />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input placeholder="State" />
                    </div>
                    <div className="space-y-2">
                      <Label>Zip Code</Label>
                      <Input placeholder="Zip code" />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="IN">India</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Same as Customer Info
                  </Button>
                  <Button variant="outline" size="sm">
                    Copy Billing Address
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <Button
            className="w-full"
            onClick={() => {
              if (editItem) {
                updateMutation.mutate({ id: editItem._id, data: editItem });
                setEditItem(null);
              }
            }}
          >
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Customers;

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
import { useQuery } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";

const statusColors: Record<string, string> = {
  Open: "bg-primary/10 text-primary border-primary/20",
  "In Progress":
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
  Closed:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
};

const Support = () => {
  const [search, setSearch] = useState("");
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const { can } = usePermissions();

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["tickets"],
    queryFn: supportService.getTickets,
  });

  const filtered = tickets.filter(
    (t: any) =>
      (t.subject || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.customer || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground">
              Manage customer support requests
            </p>
          </div>
          {can("Support", "Create") && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Ticket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="Ticket subject" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="john">John Doe</SelectItem>
                        <SelectItem value="jane">Jane Smith</SelectItem>
                        <SelectItem value="mike">Mike Johnson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input type="email" placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <Input placeholder="Enter tags separated by commas" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assign Ticket</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sarah">Sarah Chen</SelectItem>
                          <SelectItem value="alex">Alex Turner</SelectItem>
                          <SelectItem value="mike">Mike Johnson</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select defaultValue="Medium">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Service</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engineering">Engineering</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>CC</Label>
                    <Input placeholder="CC email addresses" />
                  </div>
                  <div className="space-y-2">
                    <Label>Ticket Body</Label>
                    <Textarea
                      placeholder="Describe the issue in detail..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attachments</Label>
                    <Input type="file" multiple />
                  </div>
                  <Button className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Subject</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Priority</th>
                    <th className="p-3 font-medium">Customer</th>
                    <th className="p-3 font-medium">Created</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3"><Skeleton className="h-4 w-48" /></td>
                        <td className="p-3"><Skeleton className="h-6 w-16" /></td>
                        <td className="p-3"><Skeleton className="h-6 w-16" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-8 w-16" /></td>
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No tickets found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t: any) => (
                      <tr
                        key={t._id}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="p-3 text-sm font-medium">{t.subject}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={statusColors[t.status] || statusColors["Open"]}
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              t.priority === "High"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : t.priority === "Medium"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {t.customer || t.name || "-"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {t.createdAt ? formatDate(t.createdAt) : "-"}
                        </td>
                        <td className="p-3">
                          <TableActions
                            onView={() => setViewItem(t)}
                            onEdit={can("Support", "Edit") ? () => setEditItem(t) : undefined}
                            onDelete={
                              can("Support", "Delete")
                                ? () =>
                                    toast({
                                      title: "Info",
                                      description: `Delete triggered for ${t._id}`,
                                    })
                                : undefined
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
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium">{viewItem.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="text-sm">{viewItem.customer || viewItem.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={statusColors[viewItem.status] || statusColors["Open"]}
                  >
                    {viewItem.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="text-sm">{viewItem.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {viewItem.createdAt ? formatDate(viewItem.createdAt) : "-"}
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

export default Support;

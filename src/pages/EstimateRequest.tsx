import { useState } from "react";
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
import { estimateRequests, type EstimateRequest as EstimateRequestType } from "@/data/mockData";

const statusColors: Record<EstimateRequestType["status"], string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  Reviewed: "bg-info/10 text-info border-info/20",
  Accepted: "bg-success/10 text-success border-success/20",
  Declined: "bg-destructive/10 text-destructive border-destructive/20",
};

const EstimateRequest = () => {
  const [search, setSearch] = useState("");

  const filtered = estimateRequests.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Estimate Requests</h1>
            <p className="text-muted-foreground">Manage client estimate requests</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Estimate Request</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>Title</Label><Input placeholder="Estimate title" /></div>
                <div className="space-y-2"><Label>Customer</Label><Input placeholder="Customer name" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the estimate" /></div>
                <div className="space-y-2"><Label>Estimated Value</Label><Input type="number" placeholder="0.00" /></div>
                <Button className="w-full">Submit Request</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search estimates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Title</th>
                  <th className="p-3 font-medium hidden sm:table-cell">Customer</th>
                  <th className="p-3 font-medium hidden md:table-cell">Value</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-3 text-sm font-medium">{e.title}</td>
                    <td className="p-3 text-sm hidden sm:table-cell text-muted-foreground">{e.customer}</td>
                    <td className="p-3 text-sm hidden md:table-cell">${e.value.toLocaleString()}</td>
                    <td className="p-3"><Badge variant="outline" className={`text-xs ${statusColors[e.status]}`}>{e.status}</Badge></td>
                    <td className="p-3 text-sm hidden lg:table-cell text-muted-foreground">{new Date(e.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EstimateRequest;

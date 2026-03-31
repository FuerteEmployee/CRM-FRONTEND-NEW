import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Search, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
  2: { label: "In Progress", color: "bg-primary/10 text-primary border-primary/20" },
  3: { label: "On Hold", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  4: { label: "Finished", color: "bg-green-50 text-green-700 border-green-200" },
  5: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
};

const Projects = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: projectService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: projectService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create project");
    },
  });

  const filtered = projects.filter((p: any) => {
    const matchesSearch = (p.name || "").toLowerCase().includes(search.toLowerCase());
    const statusLabel = statusMap[p.status]?.label || "";
    const matchesStatus = statusFilter === "all" || statusLabel === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Manage and track all your projects
            </p>
          </div>
          {can("Projects", "Create") && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input placeholder="Enter project name" />
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
                  <div className="flex items-center gap-2">
                    <Checkbox id="calc-progress" />
                    <Label htmlFor="calc-progress" className="font-normal">
                      Calculate progress through tasks
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Progress %</Label>
                    <Input type="number" placeholder="0" min={0} max={100} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Billing Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Rate</SelectItem>
                          <SelectItem value="hourly">Project Hours</SelectItem>
                          <SelectItem value="task">Task Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select defaultValue="2">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Not Started</SelectItem>
                          <SelectItem value="2">In Progress</SelectItem>
                          <SelectItem value="3">On Hold</SelectItem>
                          <SelectItem value="4">Finished</SelectItem>
                          <SelectItem value="5">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Hours</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Project description..." rows={4} />
                  </div>
                  <Button className="w-full">Save</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
              <SelectItem value="Finished">Finished</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center text-muted-foreground">
              No projects found.
            </div>
          ) : (
            filtered.map((p: any) => {
              const status = statusMap[p.status] || statusMap[1];
              return (
                <Card key={p._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-2" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {p.team?.map((m: any) => (
                          <Avatar
                            key={m.name}
                            className="h-7 w-7 border-2 border-background"
                          >
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {m.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.deadline ? `Deadline: ${new Date(p.deadline).toLocaleDateString()}` : "No deadline"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Projects;

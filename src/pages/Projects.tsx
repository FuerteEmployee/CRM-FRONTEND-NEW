import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileJson,
  FileType,
  Printer,
  ExternalLink,
  Edit,
  Trash2,
  Users,
  Filter,
  LayoutGrid
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const statusConfig = [
  { id: 1, label: "Not Started", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: 2, label: "In Progress", color: "bg-primary/10 text-primary border-primary/20" },
  { id: 3, label: "On Hold", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { id: 5, label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
  { id: 4, label: "Finished", color: "bg-green-50 text-green-700 border-green-200" },
];

const Projects = () => {
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<number | "all">("all");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false, status: "" });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: projectService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: projectService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete project");
    },
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      const matchesSearch = 
        (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.clientid?.company || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = activeStatus === "all" || p.status === activeStatus;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, activeStatus]);

  const handleBulkAction = async () => {
    if (selectedProjects.length === 0) {
      toast.error("No projects selected.");
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedProjects.map(id => projectService.delete(id)));
        toast.success(`Deleted ${selectedProjects.length} projects.`);
      } else if (bulkState.status) {
        const status = parseInt(bulkState.status);
        await Promise.all(selectedProjects.map(id => projectService.update(id, { status })));
        toast.success(`Updated ${selectedProjects.length} projects.`);
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProjects([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, status: "" });
    } catch (err: any) {
      toast.error("Failed to perform bulk action.");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (filteredProjects.length === 0) {
      toast.error("No data to export");
      return;
    }

    if (type === "csv" || type === "xlsx") {
      const headers = ["Project Name", "Customer", "Tags", "Start Date", "Deadline", "Status"];
      const rows = filteredProjects.map((p: any) => [
        p.name || "",
        p.clientid?.company || "Unknown",
        p.tags ? p.tags.join(", ") : "",
        p.start_date ? formatDate(p.start_date) : "-",
        p.deadline ? formatDate(p.deadline) : "-",
        statusConfig.find(s => s.id === p.status)?.label || "Not Started"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `projects_export_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported successfully as ${type.toUpperCase()}`);
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast.success("Ready to save - choose Save as PDF in print options");
      window.print();
    }
  };

  const stats = useMemo(() => {
    return statusConfig.map(status => ({
      ...status,
      count: projects.filter(p => p.status === status.id).length
    }));
  }, [projects]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projects</h1>
          {can("projects", "create") && (
            <Button onClick={() => navigate("/admin/projects/create")} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          )}
        </div>

        {/* Live Status Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveStatus("all")}
            className="h-8 text-xs font-medium"
          >
            All
            <span className="ml-1.5 opacity-60">({projects.length})</span>
          </Button>
          {stats.map((status) => (
            <Button
              key={status.id}
              variant={activeStatus === status.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveStatus(status.id)}
              className="h-8 text-xs font-medium"
            >
              {status.label}
              <span className="ml-1.5 opacity-60">({status.count})</span>
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Control Bar */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(val) => setItemsPerPage(val === "All" ? 999999 : Number(val))}
                >
                  <SelectTrigger className="w-[70px] h-8 text-[11px] font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="All">All</SelectItem>
                  </SelectContent>
                </Select>
 
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-bold uppercase tracking-wider hover:bg-transparent">
                      <Download className="h-3.5 w-3.5" />
                      Export
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer text-xs font-bold">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer text-xs font-bold">
                      <FileJson className="h-4 w-4 text-blue-600" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer text-xs font-bold">
                      <FileType className="h-4 w-4 text-red-600" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer text-xs font-bold">
                      <Printer className="h-4 w-4 text-gray-600" />
                      <span>Print</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedProjects.length === 0) {
                    toast.error("Please select at least one project first.");
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-4 rounded-md gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="massDelete" 
                          className="border-red-500 data-[state=checked]:bg-red-500"
                          checked={bulkState.massDelete}
                          onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                        />
                        <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                      </div>
                      <div className="grid grid-cols-1 gap-5 mt-2 pt-5 border-t">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
                          <Select value={bulkState.status} onValueChange={(val) => setBulkState({...bulkState, status: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Select Status" /></SelectTrigger>
                            <SelectContent>
                              {statusConfig.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                        <Button variant="outline" onClick={() => setBulkActionOpen(false)}>Cancel</Button>
                        <Button onClick={handleBulkAction} disabled={isBulkLoading}>
                          {isBulkLoading ? "Processing..." : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-8 h-8 w-[200px] text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Old Table Style */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wider bg-zinc-50/50">
                    <th className="p-3 font-semibold w-8">
                      <Checkbox 
                        checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProjects(filteredProjects.map((p: any) => p._id));
                          } else {
                            setSelectedProjects([]);
                          }
                        }}
                      />
                    </th>
                    <th className="p-3 font-semibold">#</th>
                    <th className="p-3 font-semibold">Project Name ↕</th>
                    <th className="p-3 font-semibold">Customer</th>
                    <th className="p-3 font-semibold">Tags</th>
                    <th className="p-3 font-semibold text-center">Start Date</th>
                    <th className="p-3 font-semibold text-center">Deadline</th>
                    <th className="p-3 font-semibold text-center">Members</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
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
                  ) : filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-muted-foreground text-sm">
                        No projects found.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project, index) => (
                      <tr key={project._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-3">
                          <Checkbox 
                            checked={selectedProjects.includes(project._id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedProjects([...selectedProjects, project._id]);
                              } else {
                                setSelectedProjects(selectedProjects.filter(id => id !== project._id));
                              }
                            }}
                          />
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{index + 1}</td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span
                              onClick={() => navigate(`/admin/projects/view/${project._id}`)}
                              className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                            >
                              {project.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1">{project.description}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span 
                            onClick={() => navigate(`/admin/customers/${project.clientid?._id}`)}
                            className="text-xs font-medium text-zinc-700 hover:text-primary cursor-pointer transition-colors"
                          >
                            {project.clientid?.company || "Unknown"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {project.tags && project.tags.length > 0 ? (
                              project.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[9px] px-1 h-4 font-bold uppercase">
                                  {tag.trim()}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[10px] text-zinc-300">No tags</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center text-xs text-zinc-600">
                          {project.start_date ? formatDate(project.start_date) : "-"}
                        </td>
                        <td className="p-3 text-center text-xs text-zinc-600">
                          {project.deadline ? formatDate(project.deadline) : "-"}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex -space-x-2 justify-center">
                            <Avatar className="h-6 w-6 border border-white shadow-sm">
                              <AvatarFallback className="bg-primary/5 text-primary text-[8px] font-bold">TM</AvatarFallback>
                            </Avatar>
                            <div className="h-6 w-6 border border-white shadow-sm bg-zinc-50 flex items-center justify-center rounded-full text-[8px] font-bold text-zinc-400">
                              +2
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`rounded-md px-1.5 py-0.5 font-bold text-[9px] uppercase tracking-tighter ${statusConfig.find(s => s.id === project.status)?.color || statusConfig[0].color}`}>
                            {statusConfig.find(s => s.id === project.status)?.label || "Not Started"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <TableActions
                            onView={() => navigate(`/admin/projects/view/${project._id}`)}
                            onEdit={() => navigate(`/admin/projects/edit/${project._id}`)}
                            onDelete={() => {
                              if (confirm("Are you sure you want to delete this project?")) {
                                deleteMutation.mutate(project._id);
                              }
                            }}
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
    </DashboardLayout>
  );
};

export default Projects;

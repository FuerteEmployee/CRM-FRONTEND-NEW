import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  FileDown,
  Target,
  Calendar,
  User,
  Activity,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Bell
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalService } from "@/services/goal.service";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Goals = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState("25");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalService.getGoals,
  });

  const deleteMutation = useMutation({
    mutationFn: goalService.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete goal");
    }
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredData = goals.filter((item: any) => 
    item.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.goal_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayData = pageSize === "All" ? filteredData : filteredData.slice(0, parseInt(pageSize));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
            <p className="text-muted-foreground text-sm font-medium">Set and track organizational achievements</p>
          </div>
          <Button 
            className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
            onClick={() => navigate("/admin/goals/new")}
          >
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>

        {/* Table Controls Card */}
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-border/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="w-[80px] h-9 rounded-lg border-border/40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10", "25", "50", "100", "All"].map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select>
                  <SelectTrigger className="w-[120px] h-9 rounded-lg border-border/40 bg-background font-bold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-3.5 w-3.5 text-primary" />
                      <span>Export</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="print">Print</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 max-w-sm relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search goals..." 
                  className="pl-10 h-9 rounded-lg border-border/40 bg-background focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-accent/10">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Subject</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Staff Member</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Achievement</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Start Date</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">End Date</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Goal Type</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Progress</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 text-right pr-6">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse border-border/40">
                        <TableCell colSpan={8} className="py-8">
                           <div className="h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayData.length > 0 ? (
                    displayData.map((goal: any) => (
                      <TableRow key={goal._id} className="hover:bg-accent/5 transition-colors border-border/40 group">
                        <TableCell className="py-4 font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {goal.subject}
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground font-medium">
                          {goal.staff_member?.firstname} {goal.staff_member?.lastname}
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground font-bold">
                           {goal.achievement}
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground font-medium">
                          {format(new Date(goal.start_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground font-medium text-destructive/80">
                          {format(new Date(goal.end_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="py-4">
                           <div className="flex items-center px-3 py-1 rounded-full bg-accent/10 border border-border/40 w-fit">
                             <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{goal.goal_type}</span>
                           </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="w-full max-w-[120px] space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold">
                               <span className="text-muted-foreground">Progress</span>
                               <span className="text-primary">{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-1.5 bg-accent/20" />
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              onClick={() => {
                                setSelectedGoal(goal);
                                setIsViewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              onClick={() => navigate(`/admin/goals/edit/${goal._id}`)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                              onClick={() => handleDelete(goal._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 rounded-full bg-accent/10 text-muted-foreground/40">
                            <Target className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground italic tracking-wide">No entries found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Goal Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/50 p-6">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <Target className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">{selectedGoal?.subject}</DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                  Goal Details & Status
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-6 mt-4">
              {/* Progress Panel */}
              <div className="p-4 rounded-xl bg-accent/5 border border-border/30 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Current Progress</span>
                  <span className="text-primary text-sm font-black">{selectedGoal.progress}%</span>
                </div>
                <Progress value={selectedGoal.progress} className="h-2 bg-accent/25" />
                <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                  <span>Target Achievement</span>
                  <span className="font-bold text-gray-900">{selectedGoal.achievement}</span>
                </div>
              </div>

              {/* Goal Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Staff Member</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <User className="h-4 w-4 text-primary" />
                    <span>
                      {selectedGoal.staff_member?.firstname} {selectedGoal.staff_member?.lastname}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Goal Type</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="capitalize">{selectedGoal.goal_type?.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-border/40 py-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Start Date</span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 opacity-50" />
                    <span>{format(new Date(selectedGoal.start_date), "MMMM dd, yyyy")}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">End Date</span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-destructive/80">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(new Date(selectedGoal.end_date), "MMMM dd, yyyy")}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedGoal.description && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Goal Description</span>
                  <p className="text-xs font-medium text-muted-foreground bg-accent/5 p-3 rounded-lg border border-border/20 leading-relaxed italic">
                    "{selectedGoal.description}"
                  </p>
                </div>
              )}

              {/* Notifications Setting */}
              <div className="flex items-center gap-2.5 text-[10px] font-bold text-muted-foreground border-t border-border/20 pt-4">
                <Bell className="h-4 w-4 text-primary/70" />
                <div className="flex flex-col gap-0.5">
                  <span>Notify on Achievement: {selectedGoal.notify_on_achieve ? "Yes" : "No"}</span>
                  <span>Notify on Failure: {selectedGoal.notify_on_fail ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Goals;

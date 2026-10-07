import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Target,
  Calendar,
  User,
  Activity,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Bell,
  Zap
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const Goals = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState("25");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

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

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      toast.error("No goals selected.");
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedItems.map(id => goalService.deleteGoal(id)));
        toast.success(`Deleted ${selectedItems.length} goals.`);
      }
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setSelectedItems([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch (err: any) {
      toast.error("Failed to perform bulk action.");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(displayData.map((a: any) => a._id));
    } else {
      setSelectedItems([]);
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
        <Card className="overflow-hidden">
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

                <ExportButton
                  data={filteredData}
                  filename="goals"
                  columns={[
                    { header: "Subject", key: "subject" },
                    { header: "Staff Member", key: (g) => `${g.staff_member?.firstname || ""} ${g.staff_member?.lastname || ""}`.trim() },
                    { header: "Achievement", key: "achievement" },
                    { header: "Start Date", key: (g) => g.start_date ? format(new Date(g.start_date), "yyyy-MM-dd") : "" },
                    { header: "End Date", key: (g) => g.end_date ? format(new Date(g.end_date), "yyyy-MM-dd") : "" },
                    { header: "Goal Type", key: "goal_type" },
                    { header: "Progress", key: (g) => `${g.progress ?? 0}%` },
                  ]}
                />

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedItems.length === 0) {
                    toast.error("Please select at least one goal first.");
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-9 px-4 gap-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-transparent border-border/40">
                      <Zap className="h-3.5 w-3.5 text-primary" />
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
                          onCheckedChange={(checked) => setBulkState({ ...bulkState, massDelete: checked as boolean })}
                        />
                        <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                      </div>
                      <Button
                        onClick={handleBulkAction}
                        disabled={!bulkState.massDelete || isBulkLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold tracking-widest uppercase text-xs h-12"
                      >
                        {isBulkLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
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
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.length > 0 && selectedItems.length === displayData.length}
                        onCheckedChange={handleSelectAll}
                        className="border-muted-foreground/30"
                      />
                    </TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Achievement</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Goal Type</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={9}>
                          <div className="h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayData.length > 0 ? (
                    displayData.map((goal: any) => (
                      <TableRow key={goal._id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(goal._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedItems([...selectedItems, goal._id]);
                              else setSelectedItems(selectedItems.filter(id => id !== goal._id));
                            }}
                            className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell className="font-medium group-hover:text-primary transition-colors cursor-pointer" onClick={() => {
                          setSelectedGoal(goal);
                          setIsViewOpen(true);
                        }}>
                          {goal.subject}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {goal.staff_member?.firstname} {goal.staff_member?.lastname}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {goal.achievement}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(goal.start_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-destructive/80">
                          {format(new Date(goal.end_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center px-3 py-1 rounded-full bg-accent/10 border border-border/40 w-fit">
                            <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">{goal.goal_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-full max-w-[120px] space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="text-primary">{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-1.5 bg-accent/20" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
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
                    <TableEmpty colSpan={9} />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-border/40 py-4">
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

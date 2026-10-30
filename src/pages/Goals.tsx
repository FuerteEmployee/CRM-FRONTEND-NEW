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
  TablePagination,
} from "@/components/ui/table";
import { Plus, Search, Eye, Edit2, Trash2 } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalService } from "@/services/goal.service";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate, goalTypeLabel } from "@/lib/goalTypes";

const clampProgress = (p: any) => Math.min(100, Math.max(0, Number(p) || 0));
const staffName = (g: any) => `${g.staff_member?.firstname || ""} ${g.staff_member?.lastname || ""}`.trim();

const Goals = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const base = `${pathname.startsWith("/staff") ? "/staff" : "/admin"}/goals`;
  const canCreate = can("Goals", "Create");
  const canEdit = can("Goals", "Edit");
  const canDelete = can("Goals", "Delete");

  const [pageSize, setPageSize] = useState("25");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [massDelete, setMassDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalService.getGoals,
  });

  const errorText = (error: any, fallback: string) => error?.response?.data?.message || error?.message || fallback;

  const deleteMutation = useMutation({
    mutationFn: goalService.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted successfully");
    },
    onError: (error: any) => {
      toast.error(errorText(error, "Failed to delete goal"));
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
      const results = await Promise.allSettled(selectedItems.map(id => goalService.deleteGoal(id)));
      const failed = results.filter(r => r.status === "rejected").length;
      const deleted = results.length - failed;
      if (failed) toast.error(`Deleted ${deleted} goals. ${failed} could not be deleted.`);
      else toast.success(`Deleted ${deleted} goals.`);
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setSelectedItems([]);
      setBulkActionOpen(false);
      setMassDelete(false);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const term = searchTerm.trim().toLowerCase();
  const filteredData = goals.filter((item: any) =>
    !term ||
    item.subject?.toLowerCase().includes(term) ||
    item.goal_type?.toLowerCase().includes(term) ||
    goalTypeLabel(item.goal_type).toLowerCase().includes(term) ||
    staffName(item).toLowerCase().includes(term)
  );

  const size = pageSize === "All" ? Math.max(filteredData.length, 1) : parseInt(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / size));
  const currentPage = Math.min(page, totalPages);
  const displayData = filteredData.slice((currentPage - 1) * size, currentPage * size);

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? displayData.map((a: any) => a._id) : []);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Goals</h1>
            <p className="text-sm text-muted-foreground">Set and track targets for your staff</p>
          </div>
          {canCreate && (
            <Button onClick={() => navigate(`${base}/new`)}>
              <Plus className="h-4 w-4 mr-1" />
              New Goal
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="p-3 border-b">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={pageSize} onValueChange={(v) => { setPageSize(v); setPage(1); }}>
                <SelectTrigger className="w-[80px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["10", "25", "50", "100", "All"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ExportButton
                data={filteredData}
                filename="goals"
                columns={[
                  { header: "Subject", key: "subject" },
                  { header: "Staff Member", key: (g) => staffName(g) },
                  { header: "Achievement", key: "achievement" },
                  { header: "Start Date", key: (g) => g.start_date ? formatDate(g.start_date, "yyyy-MM-dd") : "" },
                  { header: "End Date", key: (g) => g.end_date ? formatDate(g.end_date, "yyyy-MM-dd") : "" },
                  { header: "Goal Type", key: (g) => goalTypeLabel(g.goal_type) },
                  { header: "Progress", key: (g) => `${g.progress ?? 0}%` },
                ]}
              />

              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    if (selectedItems.length === 0) {
                      toast.error("Please select at least one goal first.");
                      return;
                    }
                    setMassDelete(false);
                    setBulkActionOpen(true);
                  }}
                >
                  Bulk Actions
                </Button>
              )}

              <div className="relative w-full sm:w-64 sm:ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search goals..."
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={displayData.length > 0 && displayData.every((g: any) => selectedItems.includes(g._id))}
                        onCheckedChange={(c) => handleSelectAll(c === true)}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
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
                    <TableRow key={goal._id}>
                      {canDelete && (
                        <TableCell>
                          <Checkbox
                            checked={selectedItems.includes(goal._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedItems([...selectedItems, goal._id]);
                              else setSelectedItems(selectedItems.filter(id => id !== goal._id));
                            }}
                            aria-label={`Select ${goal.subject}`}
                          />
                        </TableCell>
                      )}
                      <TableCell
                        className="font-medium max-w-[240px] truncate cursor-pointer hover:text-primary"
                        title={goal.subject}
                        onClick={() => setSelectedGoal(goal)}
                      >
                        {goal.subject}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{staffName(goal) || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{goal.achievement}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(goal.start_date)}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(goal.end_date)}</TableCell>
                      <TableCell className="whitespace-nowrap">{goalTypeLabel(goal.goal_type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[110px]">
                          <Progress value={clampProgress(goal.progress)} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground">{clampProgress(goal.progress)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View" onClick={() => setSelectedGoal(goal)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => navigate(`${base}/edit/${goal._id}`)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" aria-label="Delete" onClick={() => handleDelete(goal._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableEmpty colSpan={9} />
                )}
              </TableBody>
            </Table>
            {!isLoading && pageSize !== "All" && (
              <TablePagination page={currentPage} pageSize={size} total={filteredData.length} onPageChange={setPage} />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={bulkActionOpen} onOpenChange={(open) => { setBulkActionOpen(open); setMassDelete(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>{selectedItems.length} goal(s) selected</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox id="massDelete" checked={massDelete} onCheckedChange={(c) => setMassDelete(c === true)} />
              <Label htmlFor="massDelete" className="text-destructive">Mass Delete</Label>
            </div>
            <Button onClick={handleBulkAction} disabled={!massDelete || isBulkLoading} className="w-full">
              {isBulkLoading ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedGoal} onOpenChange={(open) => { if (!open) setSelectedGoal(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="break-words pr-6">{selectedGoal?.subject}</DialogTitle>
            <DialogDescription>{goalTypeLabel(selectedGoal?.goal_type)}</DialogDescription>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2 rounded-md border p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Progress</span>
                  <span className="font-medium">{clampProgress(selectedGoal.progress)}%</span>
                </div>
                <Progress value={clampProgress(selectedGoal.progress)} className="h-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Achievement</span>
                  <span className="font-medium">
                    {selectedGoal.current_value !== undefined ? `${selectedGoal.current_value} / ` : ""}{selectedGoal.achievement}
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="text-muted-foreground">Staff Member</dt>
                  <dd className="font-medium">{staffName(selectedGoal) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Goal Type</dt>
                  <dd className="font-medium">{goalTypeLabel(selectedGoal.goal_type)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Start Date</dt>
                  <dd className="font-medium">{formatDate(selectedGoal.start_date, "MMMM dd, yyyy")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">End Date</dt>
                  <dd className="font-medium">{formatDate(selectedGoal.end_date, "MMMM dd, yyyy")}</dd>
                </div>
              </dl>

              {selectedGoal.description && (
                <div>
                  <div className="text-muted-foreground">Goal Description</div>
                  <p className="whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{selectedGoal.description}</p>
                </div>
              )}

              <div className="border-t pt-3 text-muted-foreground">
                <div>Notify on Achievement: {selectedGoal.notify_on_achieve ? "Yes" : "No"}</div>
                <div>Notify on Failure: {selectedGoal.notify_on_fail ? "Yes" : "No"}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Goals;

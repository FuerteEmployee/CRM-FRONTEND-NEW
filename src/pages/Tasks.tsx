import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, LayoutGrid, List } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { utilityService } from "@/api/services/utility.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";

const priorityColors: Record<number, string> = {
  1: "bg-green-50 text-green-700 border-green-200",
  2: "bg-yellow-50 text-yellow-700 border-yellow-200",
  3: "bg-orange-50 text-orange-700 border-orange-200",
  4: "bg-red-50 text-red-700 border-red-200",
};

const priorityLabels: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

const statusLabels: Record<number, string> = {
  1: "To Do",
  2: "In Progress",
  3: "On Hold",
  4: "Done",
  5: "Cancelled",
};

const columns = ["To Do", "In Progress", "Done"];
const columnColors: Record<string, string> = {
  "To Do": "border-t-muted-foreground",
  "In Progress": "border-t-primary",
  Done: "border-t-green-500",
};

const Tasks = () => {
  const [view, setView] = useState<"board" | "list">("board");
  const [viewItem, setViewItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: projectService.getTasks,
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery<any[]>({
    queryKey: ["todos"],
    queryFn: utilityService.getTodos,
  });

  const isLoading = tasksLoading || todosLoading;

  // Combine tasks and todos for display
  const allTasks = [
    ...tasks.map((t: any) => ({
      ...t,
      displayStatus: statusLabels[t.status] || "To Do",
      displayPriority: priorityLabels[t.priority] || "Medium",
      isTodo: false,
    })),
    ...todos.map((todo: any) => ({
      ...todo,
      _id: todo._id,
      name: todo.description,
      displayStatus: todo.finished ? "Done" : "To Do",
      displayPriority: "Medium",
      isTodo: true,
    })),
  ];

  const getTasksByStatus = (status: string) =>
    allTasks.filter((t: any) => t.displayStatus === status);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">Track and manage team tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md">
              <Button
                variant={view === "board" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("board")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            {can("Tasks", "Create") && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox id="public" />
                        <Label htmlFor="public" className="font-normal">
                          Public
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="billable" />
                        <Label htmlFor="billable" className="font-normal">
                          Billable
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input placeholder="Task subject" />
                    </div>
                    <div className="space-y-2">
                      <Label>Hourly Rate</Label>
                      <Input type="number" placeholder="0.00" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input type="date" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select defaultValue="2">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Low</SelectItem>
                            <SelectItem value="2">Medium</SelectItem>
                            <SelectItem value="3">High</SelectItem>
                            <SelectItem value="4">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Repeat Every</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Task Description</Label>
                      <Textarea placeholder="Describe the task..." rows={3} />
                    </div>
                    <Button className="w-full">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col} className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : view === "board" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => {
              const columnTasks = getTasksByStatus(col);
              return (
                <div key={col} className="space-y-3">
                  <div
                    className={`flex items-center justify-between border-t-2 pt-3 ${columnColors[col]}`}
                  >
                    <h3 className="font-semibold text-sm">{col}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnTasks.length}
                    </Badge>
                  </div>
                  {columnTasks.map((task: any) => (
                    <Card
                      key={task._id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium leading-tight">
                            {task.name}
                          </h4>
                          {!task.isTodo && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${priorityColors[task.priority] || priorityColors[2]}`}
                            >
                              {task.displayPriority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description || "No description provided."}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {task.isTodo ? "T" : "P"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {task.isTodo ? "Personal" : "Project"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {task.duedate
                              ? formatDate(task.duedate)
                              : "No date"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="p-3 font-medium">Task</th>
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Priority</th>
                      <th className="p-3 font-medium">Due Date</th>
                      <th className="p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTasks.map((task: any) => (
                      <tr
                        key={task._id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-3 text-sm font-medium">{task.name}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {task.isTodo ? "Todo" : "Project Task"}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {task.displayStatus}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-xs ${priorityColors[task.priority] || priorityColors[2]}`}
                          >
                            {task.displayPriority}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {task.duedate ? formatDate(task.duedate) : "-"}
                        </td>
                        <td className="p-3">
                          <TableActions
                            onView={() => setViewItem(task)}
                            onEdit={can("Tasks", "Edit") ? () => setEditItem(task) : undefined}
                            onDelete={
                              can("Tasks", "Delete")
                                ? () =>
                                    toast({
                                      title: "Info",
                                      description: "Delete action triggered",
                                    })
                                : undefined
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Title</p>
                  <p className="text-sm font-medium">{viewItem.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm">
                    {viewItem.isTodo ? "Personal Todo" : "Project Task"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">
                    {viewItem.description || "No description."}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline">{viewItem.displayStatus}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge
                    variant="outline"
                    className={priorityColors[viewItem.priority] || ""}
                  >
                    {viewItem.displayPriority}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="text-sm">
                    {viewItem.duedate ? formatDate(viewItem.duedate) : "-"}
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

export default Tasks;

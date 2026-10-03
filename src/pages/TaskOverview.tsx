import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Search, ChevronDown, Download, FileSpreadsheet, FileJson, FileType, Printer, Filter
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { staffService } from "@/api/services/staff.service";
import { formatDate } from "@/lib/dateFormat";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";

const taskStatusConfig = [
  { id: 1, label: "Not Started", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  { id: 2, label: "In Progress", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { id: 3, label: "Testing", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { id: 4, label: "Awaiting Feedback", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  { id: 5, label: "Complete", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
];

const TaskOverview = () => {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Temp Filter states (before apply)
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Applied Filter states
  const [appliedFilters, setAppliedFilters] = useState({
    staff: "all",
    month: "all",
    status: "all",
    year: new Date().getFullYear().toString()
  });

  const handleApplyFilters = () => {
    setAppliedFilters({
      staff: filterStaff,
      month: filterMonth,
      status: filterStatus,
      year: filterYear
    });
    setCurrentPage(1);
  };

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["tasks-overview"],
    queryFn: () => projectService.getTasks(),
  });

  const { data: staffMembers = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString());

  const filteredTasks = useMemo(() => {
    return tasks.filter((t: any) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = appliedFilters.status === "all" || t.status === parseInt(appliedFilters.status);
      const matchesStaff = appliedFilters.staff === "all" || (t.assignees && t.assignees.includes(appliedFilters.staff));
      
      const taskDate = t.startdate ? new Date(t.startdate) : null;
      const matchesMonth = appliedFilters.month === "all" || (taskDate && (taskDate.getMonth() + 1).toString() === appliedFilters.month);
      const matchesYear = appliedFilters.year === "all" || (taskDate && taskDate.getFullYear().toString() === appliedFilters.year);
      
      return matchesSearch && matchesStatus && matchesStaff && matchesMonth && matchesYear;
    });
  }, [tasks, search, appliedFilters]);

  // Pagination logic
  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Tasks Overview</h1>
          <Link to="/admin/tasks" className="text-sm text-primary hover:underline font-medium">Back to tasks list</Link>
        </div>

        {/* Filters Card */}
        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff Member</Label>
                <Select value={filterStaff} onValueChange={setFilterStaff}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 rounded-lg">
                    <SelectValue placeholder="Select Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {staffMembers.map(m => (
                      <SelectItem key={m._id} value={m._id}>{m.firstname} {m.lastname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 rounded-lg">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 rounded-lg">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {taskStatusConfig.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="h-10 bg-white border-slate-200 rounded-lg">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleApplyFilters} className="h-10 font-bold uppercase tracking-widest text-[10px]">
                <Filter className="mr-2 h-3 w-3" />
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Table Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header Controls */}
            <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                  <SelectTrigger className="w-[70px] h-9 bg-white border-slate-200 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="1000">ALL</SelectItem>
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs font-bold bg-white border-slate-200 rounded-lg uppercase tracking-wider">
                      Export <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-green-600" /> Excel</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><FileType className="mr-2 h-3.5 w-3.5 text-red-600" /> PDF</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><FileJson className="mr-2 h-3.5 w-3.5 text-blue-600" /> JSON</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><Printer className="mr-2 h-3.5 w-3.5 text-slate-600" /> Print</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 h-9 bg-white border-slate-200 rounded-lg text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Logged Time</TableHead>
                    <TableHead>On Time?</TableHead>
                    <TableHead>Assigned to</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasksLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={10}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedTasks.length === 0 ? (
                    <TableEmpty colSpan={10}>No entries found</TableEmpty>
                  ) : (
                    paginatedTasks.map((task) => {
                      const status = taskStatusConfig.find(s => s.id === task.status) || taskStatusConfig[0];
                      const isOnTime = !task.duedate || !task.datefinished || new Date(task.datefinished) <= new Date(task.duedate);
                      
                      return (
                        <TableRow key={task._id} className="group">
                          <TableCell>
                            <span className="font-semibold text-primary hover:underline cursor-pointer">
                              {task.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            {task.startdate ? formatDate(task.startdate) : "-"}
                          </TableCell>
                          <TableCell>
                            {task.duedate ? formatDate(task.duedate) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${status.bg} ${status.text} ${status.border} border text-[10px] uppercase font-bold tracking-wider rounded-md px-2 py-1`}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>0</TableCell>
                          <TableCell>0</TableCell>
                          <TableCell>0 / 0</TableCell>
                          <TableCell>00:00</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={isOnTime ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                              {isOnTime ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex -space-x-2">
                              <Avatar className="h-7 w-7 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">TM</AvatarFallback>
                              </Avatar>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!tasksLoading && filteredTasks.length > 0 && (
              <TablePagination
                page={currentPage}
                pageSize={itemsPerPage}
                total={totalItems}
                onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), Math.max(totalPages, 1)))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TaskOverview;

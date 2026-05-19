import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, FileText, TrendingUp, Users, IndianRupee, ChevronDown, FileSpreadsheet, FileJson, FileType, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const revenueByMonth = [
  { month: "Jan", revenue: 12400 }, { month: "Feb", revenue: 15800 }, { month: "Mar", revenue: 18200 },
  { month: "Apr", revenue: 16900 }, { month: "May", revenue: 21500 }, { month: "Jun", revenue: 24100 },
];

const projectsByStatus = [
  { name: "Active", value: 3, fill: "hsl(213, 44%, 25%)" },
  { name: "Completed", value: 1, fill: "hsl(142, 71%, 45%)" },
  { name: "On Hold", value: 1, fill: "hsl(38, 92%, 50%)" },
];

const teamPerformance = [
  { name: "Sarah", tasks: 24, hours: 160 }, { name: "Alex", tasks: 21, hours: 152 },
  { name: "Mike", tasks: 18, hours: 144 }, { name: "Tom", tasks: 16, hours: 136 },
  { name: "Emily", tasks: 15, hours: 148 }, { name: "Lisa", tasks: 12, hours: 128 },
];

const Reports = () => {
  const { toast } = useToast();

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (type === "csv" || type === "xlsx") {
      const csvRows = [];
      csvRows.push("--- REVENUE OVERVIEW ---");
      csvRows.push("Month,Revenue");
      revenueByMonth.forEach(item => csvRows.push(`${item.month},${item.revenue}`));
      
      csvRows.push("");
      csvRows.push("--- PROJECTS BY STATUS ---");
      csvRows.push("Status,Count");
      projectsByStatus.forEach(item => csvRows.push(`${item.name},${item.value}`));

      csvRows.push("");
      csvRows.push("--- TEAM PERFORMANCE ---");
      csvRows.push("Name,Tasks Completed,Hours Logged");
      teamPerformance.forEach(item => csvRows.push(`${item.name},${item.tasks},${item.hours}`));

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(row => row.startsWith("---") ? row : row.split(",").map(val => `"${val}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `analytics_reports_export_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Success", description: `Exported successfully as ${type.toUpperCase()}` });
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast({ title: "Print Mode", description: "Ready to save - choose Save as PDF in print options" });
      window.print();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Analytics and insights</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="month">
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>Excel</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer">
                  <FileJson className="h-4 w-4 text-blue-600" />
                  <span>CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer">
                  <FileType className="h-4 w-4 text-red-600" />
                  <span>PDF</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer">
                  <Printer className="h-4 w-4 text-gray-600" />
                  <span>Print</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><IndianRupee className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">₹108.9K</p><p className="text-xs text-muted-foreground">Total Revenue</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">+18%</p><p className="text-xs text-muted-foreground">Growth</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-info/10"><FileText className="h-5 w-5 text-info" /></div><div><p className="text-2xl font-bold">5</p><p className="text-xs text-muted-foreground">Active Projects</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><Users className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">89</p><p className="text-xs text-muted-foreground">Customers</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader><CardTitle>Revenue Overview</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(213, 44%, 25%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader><CardTitle>Projects by Status</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={projectsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                      {projectsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader><CardTitle>Team Performance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="tasks" fill="hsl(213, 44%, 25%)" radius={[4, 4, 0, 0]} name="Tasks Completed" />
                    <Bar dataKey="hours" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Hours Logged" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;

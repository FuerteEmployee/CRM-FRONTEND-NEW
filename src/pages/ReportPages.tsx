import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { Download, ChevronDown, FileSpreadsheet, FileJson, FileType, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const salesData = [
  { month: "Jan", revenue: 12400, invoiced: 14000 }, { month: "Feb", revenue: 15800, invoiced: 17000 },
  { month: "Mar", revenue: 18200, invoiced: 19500 }, { month: "Apr", revenue: 16900, invoiced: 18000 },
  { month: "May", revenue: 21500, invoiced: 23000 }, { month: "Jun", revenue: 24100, invoiced: 26000 },
];

const expenseData = [
  { month: "Jan", amount: 8200 }, { month: "Feb", amount: 9100 }, { month: "Mar", amount: 10400 },
  { month: "Apr", amount: 9800 }, { month: "May", amount: 11200 }, { month: "Jun", amount: 12800 },
];

const expenseVsIncome = [
  { month: "Jan", income: 12400, expenses: 8200 }, { month: "Feb", income: 15800, expenses: 9100 },
  { month: "Mar", income: 18200, expenses: 10400 }, { month: "Apr", income: 16900, expenses: 9800 },
  { month: "May", income: 21500, expenses: 11200 }, { month: "Jun", income: 24100, expenses: 12800 },
];

const leadsBySource = [
  { name: "Website", value: 35, fill: "hsl(213, 44%, 25%)" }, { name: "Referral", value: 25, fill: "hsl(152, 69%, 40%)" },
  { name: "LinkedIn", value: 20, fill: "hsl(38, 92%, 50%)" }, { name: "Cold Call", value: 10, fill: "hsl(0, 70%, 55%)" },
  { name: "Conference", value: 10, fill: "hsl(270, 60%, 50%)" },
];

const timesheetData = [
  { week: "W1", billable: 120, nonBillable: 40 }, { week: "W2", billable: 135, nonBillable: 35 },
  { week: "W3", billable: 110, nonBillable: 50 }, { week: "W4", billable: 145, nonBillable: 30 },
];

const kbData = [
  { month: "Jan", views: 450, articles: 8 }, { month: "Feb", views: 620, articles: 10 },
  { month: "Mar", views: 780, articles: 12 }, { month: "Apr", views: 920, articles: 14 },
];

const ReportPage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout>
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-muted-foreground">Detailed {title.toLowerCase()} report</p></div>
        <div className="flex gap-2">
          <Select defaultValue="month"><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="week">This Week</SelectItem><SelectItem value="month">This Month</SelectItem><SelectItem value="quarter">Quarter</SelectItem><SelectItem value="year">Year</SelectItem></SelectContent>
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
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span>Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <FileJson className="h-4 w-4 text-blue-600" />
                <span>CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <FileType className="h-4 w-4 text-red-600" />
                <span>PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 cursor-pointer">
                <Printer className="h-4 w-4 text-gray-600" />
                <span>Print</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {children}
    </div>
  </DashboardLayout>
);

export const ReportSales = () => (
  <ReportPage title="Sales Report">
    <Card><CardHeader><CardTitle>Revenue vs Invoiced</CardTitle></CardHeader><CardContent>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={salesData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" /><YAxis /><Tooltip />
          <Bar dataKey="revenue" fill="hsl(213, 44%, 25%)" radius={[4,4,0,0]} name="Revenue" />
          <Bar dataKey="invoiced" fill="hsl(152, 69%, 40%)" radius={[4,4,0,0]} name="Invoiced" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent></Card>
  </ReportPage>
);

export const ReportExpenses = () => (
  <ReportPage title="Expenses Report">
    <Card><CardHeader><CardTitle>Monthly Expenses</CardTitle></CardHeader><CardContent>
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={expenseData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" /><YAxis /><Tooltip />
          <Area type="monotone" dataKey="amount" fill="hsl(213, 44%, 25%)" fillOpacity={0.2} stroke="hsl(213, 44%, 25%)" />
        </AreaChart>
      </ResponsiveContainer>
    </CardContent></Card>
  </ReportPage>
);

export const ReportExpensesVsIncome = () => (
  <ReportPage title="Expenses vs Income">
    <Card><CardHeader><CardTitle>Income vs Expenses Trend</CardTitle></CardHeader><CardContent>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={expenseVsIncome}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" /><YAxis /><Tooltip />
          <Line type="monotone" dataKey="income" stroke="hsl(142, 71%, 45%)" strokeWidth={2} />
          <Line type="monotone" dataKey="expenses" stroke="hsl(0, 70%, 55%)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </CardContent></Card>
  </ReportPage>
);

export const ReportLeads = () => (
  <ReportPage title="Leads Report">
    <Card><CardHeader><CardTitle>Leads by Source</CardTitle></CardHeader><CardContent className="flex justify-center">
      <ResponsiveContainer width="100%" height={350}>
        <PieChart><Pie data={leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
          {leadsBySource.map((e, i) => <Cell key={i} fill={e.fill} />)}
        </Pie><Tooltip /></PieChart>
      </ResponsiveContainer>
    </CardContent></Card>
  </ReportPage>
);

export const ReportTimesheets = () => (
  <ReportPage title="Timesheets Overview">
    <Card><CardHeader><CardTitle>Weekly Hours</CardTitle></CardHeader><CardContent>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={timesheetData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="week" /><YAxis /><Tooltip />
          <Bar dataKey="billable" fill="hsl(213, 44%, 25%)" radius={[4,4,0,0]} name="Billable" />
          <Bar dataKey="nonBillable" fill="hsl(38, 92%, 50%)" radius={[4,4,0,0]} name="Non-Billable" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent></Card>
  </ReportPage>
);

export const ReportKBArticles = () => (
  <ReportPage title="KB Articles Report">
    <Card><CardHeader><CardTitle>Article Views & Growth</CardTitle></CardHeader><CardContent>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={kbData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="month" /><YAxis /><Tooltip />
          <Bar dataKey="views" fill="hsl(213, 44%, 25%)" radius={[4,4,0,0]} name="Views" />
          <Bar dataKey="articles" fill="hsl(152, 69%, 40%)" radius={[4,4,0,0]} name="Articles" />
        </BarChart>
      </ResponsiveContainer>
    </CardContent></Card>
  </ReportPage>
);

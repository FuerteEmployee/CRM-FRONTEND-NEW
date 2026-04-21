import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Megaphone,
  Bell,
  ListTodo,
  ClipboardList,
} from "lucide-react";
import {
  dashboardStats,
  revenueData,
  taskProgressData,
  recentActivities,
  invoiceOverview,
  estimateOverview,
  proposalOverview,
  todoItems,
  leadsOverview,
  projectStatusOverview,
  tasks,
  projects,
  reminders,
  tickets,
  announcements,
  invoices,
} from "@/data/mockData";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { usePermissionContext } from "@/context/PermissionContext";

const statCards = [
  { label: "Invoices Awaiting Payment", value: `${invoiceOverview.unpaid} / ${invoiceOverview.total}`, icon: FileText, change: "+1", up: false, progress: (invoiceOverview.unpaid / Math.max(invoiceOverview.total, 1)) * 100 },
  { label: "Converted Leads", value: "6 / 12", icon: TrendingUp, change: "+2", up: true, progress: 50 },
  { label: "Projects In Progress", value: `${projects.filter(p => p.status === "Active").length} / ${projects.length}`, icon: FolderKanban, change: "+1", up: true, progress: (projects.filter(p => p.status === "Active").length / Math.max(projects.length, 1)) * 100 },
  { label: "Tasks Not Finished", value: `${tasks.filter(t => t.status !== "Done").length} / ${tasks.length}`, icon: CheckSquare, change: "-3", up: false, progress: (tasks.filter(t => t.status !== "Done").length / Math.max(tasks.length, 1)) * 100 },
];

const OverviewSection = ({ title, icon: Icon, items }: { title: string; icon: React.ElementType; items: { label: string; value: number; percentage: string; color?: string }[] }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 font-semibold text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {title}
    </div>
    {items.map((item) => (
      <div key={item.label} className="flex items-center justify-between text-sm">
        <span className={item.color || "text-foreground"}>{item.value} {item.label}</span>
        <div className="flex items-center gap-2">
          {parseFloat(item.percentage) > 0 && (
            <Progress value={parseFloat(item.percentage)} className="w-16 h-1.5" />
          )}
          <span className="text-muted-foreground text-xs w-12 text-right">{item.percentage}%</span>
        </div>
      </div>
    ))}
  </div>
);

const Dashboard = () => {
  const { user } = usePermissionContext();
  const [todos, setTodos] = useState(todoItems);

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const paidInvoices = invoices.filter(i => i.status === "Paid").reduce((sum, i) => sum + i.amount, 0);
  const pendingInvoices = invoices.filter(i => i.status === "Pending").reduce((sum, i) => sum + i.amount, 0);
  const overdueInvoices = invoices.filter(i => i.status === "Overdue").reduce((sum, i) => sum + i.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstname || "User"}. Here's what's happening.</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <Progress value={s.progress} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoice / Estimate / Proposal Overview + To Do */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-3">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
                <OverviewSection
                  title="Invoice overview"
                  icon={FileText}
                  items={[
                    { label: "Draft", value: invoiceOverview.draft, percentage: "0.00" },
                    { label: "Not Sent", value: invoiceOverview.notSent, percentage: "0.00" },
                    { label: "Unpaid", value: invoiceOverview.unpaid, percentage: "40.00", color: "text-destructive" },
                    { label: "Partially Paid", value: invoiceOverview.partiallyPaid, percentage: "0.00", color: "text-yellow-600" },
                    { label: "Overdue", value: invoiceOverview.overdue, percentage: "20.00", color: "text-destructive" },
                    { label: "Paid", value: invoiceOverview.paid, percentage: "40.00", color: "text-green-600" },
                  ]}
                />
                <div className="pt-4 md:pt-0 md:pl-6">
                  <OverviewSection
                    title="Estimate overview"
                    icon={ClipboardList}
                    items={[
                      { label: "Draft", value: estimateOverview.draft, percentage: "0" },
                      { label: "Not Sent", value: estimateOverview.notSent, percentage: "0" },
                      { label: "Sent", value: estimateOverview.sent, percentage: "50.00", color: "text-primary" },
                      { label: "Expired", value: estimateOverview.expired, percentage: "0" },
                      { label: "Declined", value: estimateOverview.declined, percentage: "0", color: "text-destructive" },
                      { label: "Accepted", value: estimateOverview.accepted, percentage: "50.00", color: "text-green-600" },
                    ]}
                  />
                </div>
                <div className="pt-4 md:pt-0 md:pl-6">
                  <OverviewSection
                    title="Proposal overview"
                    icon={FileText}
                    items={[
                      { label: "Draft", value: proposalOverview.draft, percentage: "50.00" },
                      { label: "Sent", value: proposalOverview.sent, percentage: "0", color: "text-primary" },
                      { label: "Open", value: proposalOverview.open, percentage: "0" },
                      { label: "Revised", value: proposalOverview.revised, percentage: "0", color: "text-yellow-600" },
                      { label: "Declined", value: proposalOverview.declined, percentage: "0", color: "text-destructive" },
                      { label: "Accepted", value: proposalOverview.accepted, percentage: "50.00", color: "text-green-600" },
                    ]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* To Do Items */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  My To Do Items
                </CardTitle>
                <Button variant="link" size="sm" className="text-xs h-auto p-0">New To Do</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Latest to do's
                </p>
                {todos.filter(t => !t.completed).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No todos found</p>
                ) : (
                  todos.filter(t => !t.completed).map(t => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <Checkbox checked={t.completed} onCheckedChange={() => toggleTodo(t.id)} className="h-3.5 w-3.5" />
                      <span className="text-xs truncate">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-1 pt-2">
                <p className="text-xs font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Latest finished to do's
                </p>
                {todos.filter(t => t.completed).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No finished todos found</p>
                ) : (
                  todos.filter(t => t.completed).map(t => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <Checkbox checked={t.completed} onCheckedChange={() => toggleTodo(t.id)} className="h-3.5 w-3.5" />
                      <span className="text-xs text-muted-foreground line-through truncate">{t.title}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-600 font-medium">Outstanding Invoices</p>
              <p className="text-xl font-bold">${pendingInvoices.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <p className="text-sm text-destructive font-medium">Past Due Invoices</p>
              <p className="text-xl font-bold">${overdueInvoices.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-sm text-green-600 font-medium">Paid Invoices</p>
              <p className="text-xl font-bold">${paidInvoices.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Section + Side Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* My Tasks / Projects / Reminders / Tickets / Announcements */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              <Tabs defaultValue="tasks">
                <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                  <TabsTrigger value="tasks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <ListTodo className="h-3.5 w-3.5" /> My Tasks
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <FolderKanban className="h-3.5 w-3.5" /> My Projects
                  </TabsTrigger>
                  <TabsTrigger value="reminders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5" /> My Reminders
                  </TabsTrigger>
                  <TabsTrigger value="tickets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <Bell className="h-3.5 w-3.5" /> Tickets
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1.5 text-xs">
                    <Megaphone className="h-3.5 w-3.5" /> Announcements
                  </TabsTrigger>
                </TabsList>

                <div className="p-4">
                  <TabsContent value="tasks" className="m-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Start Date</th>
                            <th className="pb-2 font-medium hidden md:table-cell">Tags</th>
                            <th className="pb-2 font-medium">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.filter(t => t.status !== "Done").slice(0, 5).map((t, i) => (
                            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 font-medium">{t.title}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={t.status === "In Progress" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}>
                                  {t.status}
                                </Badge>
                              </td>
                              <td className="py-2 hidden sm:table-cell text-muted-foreground">{t.startDate || "-"}</td>
                              <td className="py-2 hidden md:table-cell">
                                <div className="flex gap-1">
                                  {t.tags?.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  t.priority === "High" ? "bg-destructive/10 text-destructive border-destructive/20" :
                                  t.priority === "Medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400" :
                                  "bg-muted text-muted-foreground"
                                }>
                                  {t.priority}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {tasks.filter(t => t.status !== "Done").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No entries found</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="projects" className="m-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Start Date</th>
                            <th className="pb-2 font-medium">Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.map((p, i) => (
                            <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 font-medium">{p.name}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  p.status === "Active" ? "bg-primary/10 text-primary border-primary/20" :
                                  p.status === "Completed" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400" :
                                  "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400"
                                }>
                                  {p.status}
                                </Badge>
                              </td>
                              <td className="py-2 hidden sm:table-cell text-muted-foreground">{p.startDate}</td>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  <Progress value={p.progress} className="w-16 h-1.5" />
                                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="reminders" className="m-0">
                    <div className="space-y-3">
                      {reminders.map(r => (
                        <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{r.title}</p>
                            {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground">{r.date}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="tickets" className="m-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">Subject</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Priority</th>
                            <th className="pb-2 font-medium hidden sm:table-cell">Customer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map(tk => (
                            <tr key={tk.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-2 font-medium">{tk.subject}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  tk.status === "Open" ? "bg-primary/10 text-primary border-primary/20" :
                                  tk.status === "In Progress" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400" :
                                  "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400"
                                }>
                                  {tk.status}
                                </Badge>
                              </td>
                              <td className="py-2">
                                <Badge variant="outline" className={
                                  tk.priority === "High" ? "bg-destructive/10 text-destructive border-destructive/20" :
                                  tk.priority === "Medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400" :
                                  "bg-muted text-muted-foreground"
                                }>
                                  {tk.priority}
                                </Badge>
                              </td>
                              <td className="py-2 hidden sm:table-cell text-muted-foreground">{tk.customer}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>

                  <TabsContent value="announcements" className="m-0">
                    <div className="space-y-3">
                      {announcements.map(a => (
                        <div key={a.id} className="py-2 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{a.title}</p>
                            <span className="text-xs text-muted-foreground">{a.date}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                          <p className="text-xs text-primary mt-1">— {a.author}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Leads Overview + Project Status */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Leads Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {leadsOverview.map(l => (
                    <div key={l.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: l.fill }} />
                      <span className="text-muted-foreground">{l.name}</span>
                    </div>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leadsOverview} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {leadsOverview.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  Statistics by Project Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {projectStatusOverview.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: s.fill }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                  ))}
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={projectStatusOverview.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {projectStatusOverview.filter(s => s.value > 0).map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenue & Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(215, 16%, 47%)" }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(213, 44%, 25%)" fill="hsl(213, 44%, 25%)" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(215, 16%, 47%)" fill="hsl(215, 16%, 47%)" fillOpacity={0.08} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Task Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskProgressData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {taskProgressData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{a.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.user}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

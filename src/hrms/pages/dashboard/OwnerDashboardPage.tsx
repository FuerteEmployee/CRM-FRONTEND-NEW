import { useEffect, useState } from "react";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import {
  ShoppingCart,
  TrendingUp,
  Calendar,
  BarChart3,
  Target,
  Wallet,
  PiggyBank,
  Percent,
  Package,
  Landmark,
  ReceiptText,
  Warehouse,
  ShoppingBag,
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Banknote,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend,
} from "recharts";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { ownerDashboardService, type OwnerDashboardData } from "@/hrms/services/ownerDashboardService";
import { Badge } from "@/hrms/components/ui/badge";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f43f5e"];

const fmtCurrency = (v: number) => {
  const n = Number(v) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};
const fmtPct = (v: number) => `${(Number(v) || 0).toFixed(1)}%`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—");

const isOwnerRole = (role: any): boolean => {
  const key = (typeof role === "object" ? role?.role : role) || "";
  return /super_admin|owner|admin/i.test(key);
};

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerDashboardService.getDashboardData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (!isOwnerRole(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center gap-3">
        <ShieldAlert className="h-10 w-10 text-slate-400" />
        <p className="text-lg font-medium text-slate-800">Access Restricted</p>
        <p className="text-sm text-slate-500">This dashboard is restricted to Owner / Admin roles.</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="bg-slate-50/50 min-h-screen p-4 md:p-6 lg:p-8 space-y-8 pb-24">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-slate-200" />
          <Skeleton className="h-4 w-96 bg-slate-200" />
        </div>

        {/* Core KPIs Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl bg-slate-200" />
          ))}
        </div>

        {/* Core KPIs Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-slate-200" />
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-[320px] w-full rounded-xl bg-slate-200" />
          <Skeleton className="h-[320px] w-full rounded-xl bg-slate-200" />
        </div>

        {/* Branch / Expense Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-[320px] w-full rounded-xl bg-slate-200 lg:col-span-2" />
          <Skeleton className="h-[320px] w-full rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  const { kpis, charts, tables, hrms, aiInsights } = data;

  const KpiCard = ({ title, value, icon: Icon, colorClass, bgClass, isNegative = false }: any) => (
    <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 ${bgClass} rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform`} />
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <p className={`text-2xl font-semibold tracking-tight ${isNegative ? 'text-rose-600' : 'text-slate-800'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${bgClass} ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50/50 min-h-screen p-4 md:p-6 lg:p-8 space-y-8 font-inter pb-24">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            Owner Dashboard
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Live</Badge>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Real-time financial and operational intelligence
          </p>
        </div>
      </div>

      {/* Core KPIs Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Today's Sales" value={fmtCurrency(kpis.todaySales)} icon={ShoppingCart} colorClass="text-blue-600" bgClass="bg-blue-50" />
        <KpiCard title="Net Profit" value={fmtCurrency(kpis.netProfit)} icon={PiggyBank} isNegative={kpis.netProfit < 0} colorClass={kpis.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"} bgClass={kpis.netProfit >= 0 ? "bg-emerald-50" : "bg-rose-50"} />
        <KpiCard title="Receivables" value={fmtCurrency(kpis.accountsReceivable)} icon={ReceiptText} colorClass="text-rose-600" bgClass="bg-rose-50" />
        <KpiCard title="Cash & Bank" value={fmtCurrency(kpis.cashBalance + kpis.bankBalance)} icon={Landmark} colorClass="text-amber-600" bgClass="bg-amber-50" />
      </div>

      {/* Core KPIs Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp className="h-4 w-4" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Yesterday's Sales</p><p className="text-lg font-semibold text-slate-800">{fmtCurrency(kpis.yesterdaySales)}</p></div>
        </div>
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Calendar className="h-4 w-4" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Month Sales</p><p className="text-lg font-semibold text-slate-800">{fmtCurrency(kpis.monthSales)}</p></div>
        </div>
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Target className="h-4 w-4" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Target Achieved</p><p className="text-lg font-semibold text-slate-800">{fmtPct(kpis.targetAchievementPct)}</p></div>
        </div>
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-lg"><Wallet className="h-4 w-4" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Gross Profit</p><p className="text-lg font-semibold text-slate-800">{fmtCurrency(kpis.grossProfit)}</p></div>
        </div>
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-slate-50 text-slate-600 rounded-lg"><Warehouse className="h-4 w-4" /></div>
          <div><p className="text-xs text-slate-500 font-medium">Inventory Value</p><p className="text-lg font-semibold text-slate-800">{fmtCurrency(kpis.inventoryValue)}</p></div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800">Sales vs Profit</h3>
              <p className="text-xs text-slate-500 font-medium">Last 30 Days Trend</p>
            </div>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><BarChart3 className="h-4 w-4" /></div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts.dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={fmtDate} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)} width={40} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => fmtCurrency(v)} labelFormatter={fmtDate} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800">Cash Flow</h3>
              <p className="text-xs text-slate-500 font-medium">Receipts & Payments</p>
            </div>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md"><Landmark className="h-4 w-4" /></div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts.cashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={fmtDate} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)} width={40} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => fmtCurrency(v)} labelFormatter={fmtDate} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} iconType="circle" />
                <Line type="monotone" dataKey="closingBalance" name="Balance" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="receipts" name="Receipts" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payments" name="Payments" stroke="#f43f5e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Branch Performance</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.branchSales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)} width={40} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => fmtCurrency(v)} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Expense Breakdown</h3>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-center">
            {charts.expenseByCategory.length ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={charts.expenseByCategory} cx="50%" cy="50%" outerRadius={75} innerRadius={50} dataKey="value" strokeWidth={0} paddingAngle={2}>
                      {charts.expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: any) => fmtCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                  {charts.expenseByCategory.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-medium text-slate-600">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 h-full">
                <PieChart className="h-8 w-8 opacity-20" />
                <p className="text-sm font-medium">No expenses yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HRMS & HR Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <Users className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-800">HR & Payroll</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Total Employees</p>
            <p className="text-xl font-semibold text-slate-800">{hrms.totalEmployees}</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Present Today</p>
            <p className="text-xl font-semibold text-emerald-600">{hrms.presentToday}</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Absent Today</p>
            <p className="text-xl font-semibold text-rose-600">{hrms.absentToday}</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">On Leave</p>
            <p className="text-xl font-semibold text-amber-600">{hrms.onLeaveToday}</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Attendance</p>
            <p className="text-xl font-semibold text-indigo-600">{fmtPct(hrms.attendancePct)}</p>
          </div>
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 mb-1">Payroll Est.</p>
            <p className="text-xl font-semibold text-slate-800">{fmtCurrency(hrms.monthlyPayroll)}</p>
          </div>
        </div>
      </div>

      {/* Data Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Table 1 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800">Top Salespersons</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Performance vs Target</p>
            </div>
            <Badge variant="outline" className="bg-white text-slate-500">This Month</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500">Employee</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Target</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Achieved</th>
                </tr>
              </thead>
              <tbody>
                {tables.topSalespersons.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-5 font-medium text-slate-800">{s.name}</td>
                    <td className="py-3 px-5 text-right text-slate-500">{fmtCurrency(s.target)}</td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-800">
                      <div className="flex items-center justify-end gap-2">
                        {fmtCurrency(s.achieved)}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${s.achievementPct >= 100 ? "bg-emerald-100 text-emerald-700" : s.achievementPct >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                          {s.achievementPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800">Outstanding Customers</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Highest pending balances</p>
            </div>
            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Attention</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500">Customer</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Last Txn</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {tables.outstandingCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-5 font-medium text-slate-800">{c.name}</td>
                    <td className="py-3 px-5 text-right text-slate-500 text-xs">{fmtDate(c.lastTransaction)}</td>
                    <td className="py-3 px-5 text-right font-semibold text-rose-600">{fmtCurrency(c.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800">Top Selling Products</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">By volume this month</p>
            </div>
            <Badge variant="outline" className="bg-white text-slate-500">This Month</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500">Product</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Qty</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tables.topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-5 font-medium text-slate-800 truncate max-w-[200px]">{p.name}</td>
                    <td className="py-3 px-5 text-right text-slate-600 font-medium">{p.qty}</td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-800">{fmtCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 4 */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800">Top Customers</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Highest revenue this month</p>
            </div>
            <Badge variant="outline" className="bg-white text-slate-500">This Month</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-5 font-medium text-slate-500">Customer</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Invoices</th>
                  <th className="text-right py-3 px-5 font-medium text-slate-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tables.topCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="py-3 px-5 font-medium text-slate-800">{c.name}</td>
                    <td className="py-3 px-5 text-right text-slate-600 font-medium">{c.invoices}</td>
                    <td className="py-3 px-5 text-right font-semibold text-slate-800">{fmtCurrency(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* AI Business Insights */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm rounded-xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-indigo-100/50 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-slate-800">AI Business Insights</h3>
        </div>
        <div className="p-5">
          <div className="grid md:grid-cols-2 gap-4">
            {aiInsights.map((insight, i) => (
              <div key={i} className="bg-white/60 border border-white/80 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0">{insight.analysisType}</Badge>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{insight.insights}</p>
              </div>
            ))}
            {!aiInsights.length && (
              <p className="text-sm text-slate-500 font-medium">No insights generated yet.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

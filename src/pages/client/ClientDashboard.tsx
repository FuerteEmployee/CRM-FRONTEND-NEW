import { Card, CardContent } from "@/components/ui/card";
import {
  Paperclip,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const projectStats = [
  {
    label: "Not Started",
    count: 0,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    icon: Clock,
  },
  {
    label: "In Progress",
    count: 0,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
    icon: TrendingUp,
  },
  {
    label: "On Hold",
    count: 0,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    icon: AlertCircle,
  },
  {
    label: "Cancelled",
    count: 0,
    color: "text-rose-500",
    bgColor: "bg-rose-50",
    icon: XCircle,
  },
  {
    label: "Finished",
    count: 0,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    icon: CheckCircle2,
  },
];

const invoiceStats = [
  {
    label: "Unpaid",
    count: 0,
    total: 0,
    percentage: 0,
    gradient: "from-rose-400 to-rose-500",
  },
  {
    label: "Paid",
    count: 0,
    total: 0,
    percentage: 0,
    gradient: "from-emerald-400 to-emerald-500",
  },
  {
    label: "Overdue",
    count: 0,
    total: 0,
    percentage: 0,
    gradient: "from-amber-400 to-amber-500",
  },
  {
    label: "Partially Paid",
    count: 0,
    total: 0,
    percentage: 0,
    gradient: "from-sky-400 to-sky-500",
  },
];

const ClientDashboard = () => {
  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Actions */}
      <div className="flex justify-end items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-all gap-2 text-foreground font-semibold h-9 rounded-full px-4"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Files
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-all gap-2 text-foreground font-semibold h-9 rounded-full px-4"
        >
          <Calendar className="h-3.5 w-3.5" />
          Calendar
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Good Afternoon <span className="text-primary">klllkm!</span>
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Projects Summary */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-primary/40" />
          <h2 className="text-lg font-bold text-slate-800">Projects Summary</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {projectStats.map((stat) => (
            <Card
              key={stat.label}
              className="group border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white/80 backdrop-blur-md overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] cursor-default"
            >
              <CardContent className="p-5 flex flex-col gap-3">
                <div
                  className={`p-2 rounded-lg w-fit ${stat.bgColor} transition-colors group-hover:scale-110 duration-300`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p
                    className={`text-2xl font-black ${stat.color} tracking-tight`}
                  >
                    {stat.count}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Invoices Info */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-indigo-400/40" />
            <h2 className="text-lg font-bold text-slate-800">
              Quick Invoices Info
            </h2>
          </div>
          <Button
            variant="link"
            className="text-primary text-xs font-bold hover:no-underline hover:text-primary/80 transition-colors uppercase tracking-widest"
          >
            View Account Statement
          </Button>
        </div>

        <Card className="border-none shadow-[0_4px_25px_rgb(0,0,0,0.04)] bg-white/95 backdrop-blur-xl overflow-hidden rounded-2xl">
          <CardContent className="p-8 md:p-10 space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
              {invoiceStats.map((stat) => (
                <div key={stat.label} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-800">
                      {stat.label}
                    </span>
                    <span className="text-[10px] font-black text-slate-400">
                      <span className="text-slate-900 text-sm">
                        {stat.count}
                      </span>{" "}
                      / {stat.total}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full bg-gradient-to-r ${stat.gradient} transition-all duration-1000 ease-out`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      Completion
                    </p>
                    <p className="text-xs font-black text-slate-700">
                      {stat.percentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="pt-10 border-t border-slate-50 min-h-[300px] flex flex-col items-center justify-center relative bg-gradient-to-b from-transparent to-slate-50/30 rounded-b-xl">
              <div className="flex flex-wrap items-center justify-center gap-6 mb-10 px-4">
                {invoiceStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center gap-2 group cursor-pointer"
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-gradient-to-tr ${stat.gradient} shadow-sm group-hover:scale-125 transition-transform`}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest group-hover:text-slate-700 transition-colors">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Aesthetic Chart Placeholder Grid */}
              <div className="w-full h-48 px-10 flex items-end gap-1.5 opacity-20 hover:opacity-30 transition-opacity">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-sm"
                    style={{ height: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>

              <div className="w-full h-px bg-slate-100 mt-6" />
              <div className="flex justify-between w-full pt-3 px-6 text-[9px] text-slate-400 font-black font-mono tracking-tighter opacity-60">
                <span>-1.0</span>
                <span>-0.5</span>
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ClientDashboard;

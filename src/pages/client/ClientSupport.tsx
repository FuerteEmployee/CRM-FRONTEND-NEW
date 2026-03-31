import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  MessageCircle,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const supportStats = [
  {
    label: "Total Tickets",
    count: 0,
    icon: MessageCircle,
    color: "text-primary",
    bgColor: "bg-primary/5",
  },
  {
    label: "Open",
    count: 0,
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  {
    label: "Closed",
    count: 0,
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
];

export default function ClientSupport() {
  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Support Tickets
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Get help and track your support inquiries.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white gap-2 font-bold rounded-full px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <Plus className="h-4 w-4" />
          Open New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {supportStats.map((stat) => (
          <Card
            key={stat.label}
            className="group border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] bg-white/80 backdrop-blur-md overflow-hidden transition-all hover:scale-[1.02] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] cursor-default rounded-2xl"
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div
                className={`p-3 rounded-xl ${stat.bgColor} transition-colors group-hover:scale-110 duration-300`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {stat.count}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-[0_4px_25px_rgb(0,0,0,0.03)] bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-slate-100 text-muted-foreground gap-2 font-bold"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
            </div>
            <div className="relative w-full md:w-72 group">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search tickets..."
                className="pl-10 h-10 border-slate-100 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50/50">
                  <th className="py-4 px-8">Contact / Subject</th>
                  <th className="py-4 px-6">Last Reply</th>
                  <th className="py-4 px-6">Created</th>
                  <th className="py-4 px-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50 last:border-none">
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <AlertCircle className="h-8 w-8 text-slate-300" />
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
                        No tickets found
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

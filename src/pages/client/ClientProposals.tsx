import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, FileText, Filter, MoreHorizontal, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const proposals = [
  {
    id: "PROP-101",
    subject: "Brand Identity",
    amount: "$8,500.00",
    date: "2024-03-25",
    open_till: "2024-04-25",
    status: "Open",
  },
  {
    id: "PROP-102",
    subject: "Social Media Strategy",
    amount: "$2,400.00",
    date: "2024-03-26",
    open_till: "2024-04-26",
    status: "Revised",
  },
];

export default function ClientProposals() {
  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Proposals
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Review and respond to project proposals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-none shadow-[0_4px_25px_rgb(0,0,0,0.03)] bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl p-8 flex flex-col items-center justify-center space-y-6">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray="364.4"
                strokeDashoffset="273.3"
                className="text-primary"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-800">25%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Open
              </span>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-slate-800">
              Proposals by Status
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              New Proposals Awaiting Review
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-[0_4px_25px_rgb(0,0,0,0.03)] bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full group">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search proposals..."
                  className="pl-10 h-10 border-slate-100 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl border-slate-100 text-muted-foreground gap-2 font-bold whitespace-nowrap"
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50/50">
                    <th className="py-4 px-8">Proposal #</th>
                    <th className="py-4 px-6">Subject</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Open Till</th>
                    <th className="py-4 px-8 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {proposals.map((prop) => (
                    <tr
                      key={prop.id}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Send className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-slate-700">
                            {prop.id}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 font-bold text-slate-900">
                        {prop.subject}
                      </td>
                      <td className="py-5 px-6 font-black text-slate-900">
                        {prop.amount}
                      </td>
                      <td className="py-5 px-6 text-sm font-bold text-muted-foreground">
                        {prop.date}
                      </td>
                      <td className="py-5 px-6 text-sm font-bold text-muted-foreground">
                        {prop.open_till}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Badge
                            className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm border-none ${
                              prop.status === "Open"
                                ? "bg-primary text-white"
                                : prop.status === "Revised"
                                  ? "bg-indigo-400 text-white"
                                  : "bg-rose-500 text-white"
                            }`}
                          >
                            {prop.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

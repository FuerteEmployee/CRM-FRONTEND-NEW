import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, FileText, Filter, Signature, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const contracts = [
  {
    id: 1,
    subject: "Software Development Agreement",
    type: "Service",
    signature: "Signed",
    start: "2024-01-01",
    end: "2024-12-31",
  },
  {
    id: 2,
    subject: "Maintenance Contract",
    type: "Support",
    signature: "Pending",
    start: "2024-03-01",
    end: "2025-02-28",
  },
];

export default function ClientContracts() {
  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Contracts
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Review and manage your active agreements.
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
                strokeDashoffset="91.1"
                className="text-primary"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-800">75%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active
              </span>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-slate-800">
              Contracts by Type
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              General Service Agreements
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-[0_4px_25px_rgb(0,0,0,0.03)] bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl">
          <CardContent className="p-0">
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full group">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search contracts..."
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
                    <th className="py-4 px-8">Subject</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Signature</th>
                    <th className="py-4 px-6">Start Date</th>
                    <th className="py-4 px-8 text-right">End Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-slate-700">
                            {contract.subject}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {contract.type}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                          <Signature
                            className={`h-3.5 w-3.5 ${contract.signature === "Signed" ? "text-emerald-500" : "text-amber-400"}`}
                          />
                          {contract.signature}
                        </div>
                      </td>
                      <td className="py-5 px-6 text-sm font-bold text-muted-foreground">
                        {contract.start}
                      </td>
                      <td className="py-5 px-8 text-right text-sm font-bold text-muted-foreground">
                        {contract.end}
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

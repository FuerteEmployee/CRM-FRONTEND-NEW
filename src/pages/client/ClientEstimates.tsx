import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  Calculator,
  Filter,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const estimates = [
  {
    id: "EST-001",
    subject: "Cloud Migration",
    amount: "₹5,400.00",
    date: "2024-03-20",
    expiry: "2024-04-20",
    status: "Pending",
  },
  {
    id: "EST-002",
    subject: "Design System",
    amount: "₹3,200.00",
    date: "2024-03-22",
    expiry: "2024-04-22",
    status: "Accepted",
  },
];

export default function ClientEstimates() {
  return (
    <div className="space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Estimates
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Review and approve project cost estimates.
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
                strokeDashoffset="182.2"
                className="text-indigo-500"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-800">50%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Accepted
              </span>
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-black text-slate-800">
              Estimates by Status
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Awaiting Your Approval
            </p>
          </div>
        </Card>

        <Card className="lg:col-span-2 border shadow-sm bg-card overflow-hidden rounded-lg">
          <CardContent className="p-0">
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full group">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search estimates..."
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estimate #</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.map((est) => (
                    <TableRow
                      key={est.id}
                      className="group"
                    >
                      <TableCell>
                        {est.id}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{est.subject}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">{est.amount}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {est.date}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {est.expiry}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Badge
                            className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm border-none ${
                              est.status === "Accepted"
                                ? "bg-emerald-500 text-white"
                                : est.status === "Pending"
                                  ? "bg-amber-400 text-white"
                                  : "bg-rose-500 text-white"
                            }`}
                          >
                            {est.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-slate-400 hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

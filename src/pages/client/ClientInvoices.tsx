import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileDown,
  Filter,
  MoreHorizontal,
  Receipt,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const invoices = [
  {
    id: "INV-2024-001",
    amount: "$1,250.00",
    tax: "$125.00",
    date: "2024-03-01",
    due: "2024-03-15",
    status: "Paid",
  },
  {
    id: "INV-2024-002",
    amount: "$850.00",
    tax: "$85.00",
    date: "2024-03-10",
    due: "2024-03-24",
    status: "Unpaid",
  },
  {
    id: "INV-2024-003",
    amount: "$2,100.00",
    tax: "$210.00",
    date: "2024-03-15",
    due: "2024-03-29",
    status: "Overdue",
  },
];

export default function ClientInvoices() {
  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Invoices
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Manage and view your billing history.
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 font-bold rounded-full px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
          <FileDown className="h-4 w-4" />
          Download Statement
        </Button>
      </div>

      <Card className="border-none shadow-[0_4px_25px_rgb(0,0,0,0.03)] bg-white/90 backdrop-blur-md overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                >
                  Paid
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                >
                  Unpaid
                </Button>
              </div>
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
                placeholder="Search invoice number..."
                className="pl-10 h-10 border-slate-100 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50/50">
                  <th className="py-4 px-8">Invoice #</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Total Tax</th>
                  <th className="py-4 px-6">Issue Date</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-8 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((inv, i) => (
                  <tr
                    key={inv.id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-700">
                          {inv.id}
                        </span>
                      </div>
                    </td>
                    <td className="py-5 px-6 font-black text-slate-900">
                      {inv.amount}
                    </td>
                    <td className="py-5 px-6 text-sm font-bold text-muted-foreground">
                      {inv.tax}
                    </td>
                    <td className="py-5 px-6 text-sm font-bold text-muted-foreground">
                      {inv.date}
                    </td>
                    <td className="py-5 px-6 text-sm font-bold text-muted-foreground">
                      {inv.due}
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Badge
                          className={`px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm border-none ${
                            inv.status === "Paid"
                              ? "bg-emerald-500 text-white"
                              : inv.status === "Unpaid"
                                ? "bg-amber-400 text-white"
                                : "bg-rose-500 text-white"
                          }`}
                        >
                          {inv.status}
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
  );
}

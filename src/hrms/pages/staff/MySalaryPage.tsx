import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/hrms/components/ui/card";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import {
  Landmark,
  LayoutDashboard,
  Eye,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { employeeService } from "@/hrms/services/hrService";
import { salaryTemplateService } from "@/hrms/services/salaryTemplateService";
import { toast } from "@/hrms/hooks/use-toast";
import { cn } from "@/hrms/lib/utils";
import SalarySlipViewer from "@/hrms/components/payroll/SalarySlipViewer";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const statusStyle: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  approved: "bg-blue-100 text-blue-700",
  generated: "bg-amber-100 text-amber-700",
  draft: "bg-muted text-muted-foreground",
  hold: "bg-destructive/10 text-destructive",
};

const MySalaryPage = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingSlipId, setViewingSlipId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = await employeeService.getMyPayroll();
        setRecords(Array.isArray(data) ? data : []);
      } catch (err: any) {
        toast({ title: "Failed to load salary history", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const latest = records[0];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Staff Portal</span>
          <span className="text-xs">/</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">My Salary</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Salary <span className="text-primary">History</span>
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">View and download your monthly salary slips.</p>
      </div>

      {latest && (
        <Card className="glass-deep border-0 overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                  Latest Net Pay — {MONTH_NAMES[latest.month - 1]} {latest.year}
                </p>
                <p className="text-2xl font-black text-foreground">{INR(latest.netSalary)}</p>
              </div>
            </div>
            <Badge className={cn("rounded-lg text-[10px] font-bold uppercase tracking-widest px-3 py-1 border-0", statusStyle[latest.status] || statusStyle.draft)}>
              {latest.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className="glass-deep border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold">Salary Slips</CardTitle>
          <CardDescription className="text-xs">All months your salary has been processed for</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/20">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-6 flex items-center justify-between animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-16 bg-muted rounded-full" />
                </div>
              ))
            ) : records.length > 0 ? (
              records.map((rec) => (
                <div key={rec._id} className="p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl flex flex-col items-center justify-center text-center border shadow-sm bg-primary/5 border-primary/10 text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground/90">
                        {MONTH_NAMES[rec.month - 1]} {rec.year}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {rec.presentDays ?? 0} present days · Net {INR(rec.netSalary)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={cn("rounded-lg text-[10px] font-bold uppercase tracking-widest px-3 py-1 border-0", statusStyle[rec.status] || statusStyle.draft)}>
                      {rec.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl font-bold text-xs gap-1.5"
                      onClick={() => setViewingSlipId(rec._id)}
                    >
                      <Eye className="h-3.5 w-3.5" /> View Slip
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center text-muted-foreground">
                <Landmark className="h-16 w-16 mx-auto mb-4 opacity-5" />
                <p className="text-sm font-bold">No salary slips yet.</p>
                <p className="text-xs mt-1">Your payslips will appear here once payroll is processed.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {viewingSlipId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <SalarySlipViewer
              payrollId={viewingSlipId}
              onClose={() => setViewingSlipId(null)}
              fetchSlip={salaryTemplateService.getMyPayrollSlip}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MySalaryPage;

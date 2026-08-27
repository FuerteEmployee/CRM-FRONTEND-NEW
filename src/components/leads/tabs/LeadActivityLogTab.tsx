import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { formatDateTime } from "@/lib/dateFormat";
import { utilityService } from "@/api/services/utility.service";

export function LeadActivityLogTab({ lead }: { lead: any }) {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["lead-activity-log", lead._id],
    queryFn: () => utilityService.getActivityLogs({ rel_id: lead._id, rel_type: "lead" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <Activity className="h-8 w-8 mx-auto text-slate-300" />
        <p className="text-sm text-slate-400 font-medium">No activity recorded yet for this lead</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log: any, idx: number) => {
        const actorName = log.staffid
          ? [log.staffid.firstname, log.staffid.lastname].filter(Boolean).join(" ")
          : "System";
        return (
          <div key={log._id} className="flex gap-3 pb-6 relative">
            <div className="flex flex-col items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
              {idx < logs.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
            </div>
            <div className="flex-1 -mt-0.5 pb-2">
              <p className="text-sm font-bold text-slate-800">{log.description}</p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                {actorName} · {formatDateTime(log.date || log.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

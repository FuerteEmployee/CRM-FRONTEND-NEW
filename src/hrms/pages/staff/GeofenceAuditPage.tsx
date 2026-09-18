import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { employeeApi } from "@/hrms/services/api";
import { toast } from "@/hrms/hooks/use-toast";
import { DataTable } from "@/hrms/components/common/DataTable";
import {
    ShieldAlert,
    RefreshCw,
    Clock,
    Building2,
    User as UserIcon,
    Ruler,
    Radio,
} from "lucide-react";

const PAGE_LIMIT = 25;

interface GeofenceAuditLog {
    _id: string;
    userId: { _id: string; name: string; email: string } | null;
    branchId: { _id: string; name: string } | null;
    date: string;
    time: string;
    radiusM?: number;
    distanceM?: number;
    windowMin?: number;
    fixesInWindow?: number;
    trigger?: "background" | "client" | "replay";
}

export default function GeofenceAuditPage() {
    const [logs, setLogs] = useState<GeofenceAuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const loadLogs = useCallback(async (pg: number) => {
        setIsLoading(true);
        try {
            const result = await employeeApi.getGeofenceAuditLogs({ page: pg, limit: PAGE_LIMIT });
            setLogs(result.data);
            setTotal(result.total);
        } catch {
            toast({ title: "Error", description: "Failed to load geofence audit logs", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleRefresh = () => loadLogs(page);

    const getTriggerBadge = (trigger?: string) => {
        const label = trigger === "client" ? "Manual Check" : trigger === "replay" ? "Offline Replay" : "Background";
        return (
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold gap-1 py-1 rounded-xl">
                <Radio className="h-3.5 w-3.5 text-amber-600" />
                {label}
            </Badge>
        );
    };

    const format12Hour = (timeStr?: string) => {
        if (!timeStr) return "—";
        const parts = timeStr.split(":");
        if (parts.length < 2) return timeStr;
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
    };

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <PageHeader
                    title="Geofence Audit Trail"
                    subtitle="A record of every automatic punch-out triggered by an employee leaving their branch's geofence"
                />
                <Button
                    variant="outline"
                    className="rounded-2xl h-12 px-6 font-semibold gap-2 border-slate-200"
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-800">Auto Punch-Out Events</h2>
                        <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                            {total > 0 ? `${total} total entries` : "No entries found"}
                        </p>
                    </div>
                </div>

                <DataTable
                    data={logs}
                    isLoading={isLoading}
                    pageSize={PAGE_LIMIT}
                    totalItems={total}
                    currentPage={page}
                    onPageChange={setPage}
                    columns={[
                        {
                            header: "Employee",
                            accessorKey: (row) => (
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                                        <UserIcon className="h-4.5 w-4.5 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-700">{row.userId?.name || "Unknown"}</p>
                                        <p className="text-xs text-slate-400">{row.userId?.email || "—"}</p>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            header: "Branch",
                            accessorKey: (row) => (
                                <div className="flex items-center gap-1.5 text-slate-600 text-sm font-medium">
                                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                    {row.branchId?.name || "—"}
                                </div>
                            ),
                        },
                        {
                            header: "Date & Time",
                            accessorKey: (row) => (
                                <div className="flex items-center gap-1.5 text-slate-600 text-sm font-medium">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    {row.date} · {format12Hour(row.time)}
                                </div>
                            ),
                        },
                        {
                            header: "Distance from Geofence",
                            accessorKey: (row) => (
                                <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                    <Ruler className="h-3.5 w-3.5 text-slate-400" />
                                    {row.distanceM != null ? `${Math.round(row.distanceM)}m` : "—"}
                                    {row.radiusM != null && (
                                        <span className="text-xs text-slate-400">(limit {row.radiusM}m)</span>
                                    )}
                                </div>
                            ),
                        },
                        {
                            header: "Fixes / Window",
                            accessorKey: (row) => (
                                <span className="text-slate-600 text-sm">
                                    {row.fixesInWindow ?? "—"} fixes over {row.windowMin ?? "—"} min
                                </span>
                            ),
                        },
                        {
                            header: "Trigger",
                            accessorKey: (row) => getTriggerBadge(row.trigger),
                        },
                    ]}
                />
            </div>
        </div>
    );
}

import { useEffect, useState, useCallback, useRef } from "react";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { Input } from "@/hrms/components/ui/input";
import { employeeApi } from "@/hrms/services/api";
import { toast } from "@/hrms/hooks/use-toast";
import { DataTable } from "@/hrms/components/common/DataTable";
import {
    Activity,
    RefreshCw,
    Search,
    Clock,
    Smartphone,
    Monitor,
    Globe,
    LogIn,
    LogOut,
    User as UserIcon,
    MapPin,
} from "lucide-react";

const PAGE_LIMIT = 10;

interface SessionLog {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
        mobile?: string;
        role?: any;
    } | null;
    action: "login" | "logout";
    date: string;
    time: string;
    deviceId?: string;
    deviceName?: string;
    ipAddress?: string;
    userAgent?: string;
    latitude?: number | null;
    longitude?: number | null;
    address?: string | null;
    createdAt: string;
}

export default function SessionLogsPage() {
    const [logs, setLogs]             = useState<SessionLog[]>([]);
    const [isLoading, setIsLoading]   = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter]  = useState("");
    const [page, setPage]  = useState(1);
    const [total, setTotal] = useState(0);

    // Debounce search — reset page and wait 400 ms before fetching
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadLogs = useCallback(async (pg: number, search: string, date: string) => {
        setIsLoading(true);
        try {
            const result = await employeeApi.getSessionLogs({
                page: pg,
                limit: PAGE_LIMIT,
                ...(search ? { search } : {}),
                ...(date   ? { date }   : {}),
            });
            setLogs(result.data);
            setTotal(result.total);
        } catch {
            toast({ title: "Error", description: "Failed to load session logs", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch when page or dateFilter changes immediately
    useEffect(() => {
        loadLogs(page, searchQuery, dateFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, dateFilter]);

    // Debounce search: reset to page 1, wait 400 ms
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setPage(1);
            loadLogs(1, value, dateFilter);
        }, 400);
    };

    const handleDateChange = (value: string) => {
        setDateFilter(value);
        setPage(1);
        // useEffect will fire because dateFilter changed
    };

    const handleRefresh = () => {
        loadLogs(page, searchQuery, dateFilter);
    };

    const getDeviceIcon = (userAgent?: string) => {
        if (!userAgent) return <Monitor className="h-4 w-4 text-slate-400" />;
        const ua = userAgent.toLowerCase();
        if (ua.includes("android") || ua.includes("iphone") || ua.includes("ipad") || ua.includes("mobile")) {
            return <Smartphone className="h-4 w-4 text-indigo-500" />;
        }
        return <Monitor className="h-4 w-4 text-slate-500" />;
    };

    const getActionBadge = (action: string) => {
        if (action === "login") {
            return (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold gap-1 py-1 rounded-xl">
                    <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                    Login
                </Badge>
            );
        }
        return (
            <Badge className="bg-slate-50 text-slate-700 border border-slate-200 font-semibold gap-1 py-1 rounded-xl">
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                Logout
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
                    title="Session & Device Logs"
                    subtitle="Audit and track employee login and logout activity across devices"
                />
                <Button
                    variant="outline"
                    className="rounded-2xl h-12 px-6 font-semibold gap-2 border-slate-200"
                    onClick={handleRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh Logs
                </Button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-inherit border border-white/60 p-4 rounded-3xl shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by employee name or email..."
                        className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-2xl text-sm"
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <input
                        type="date"
                        className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-600 focus:outline-none cursor-pointer w-full sm:w-[160px]"
                        value={dateFilter}
                        onChange={(e) => handleDateChange(e.target.value)}
                    />
                    {dateFilter && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-400 hover:text-slate-600"
                            onClick={() => handleDateChange("")}
                        >
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-800">Activity Logs</h2>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">
                                {total > 0 ? `${total} total entries` : "No entries found"}
                            </p>
                        </div>
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
                            header: "Action",
                            accessorKey: (row) => getActionBadge(row.action),
                        },
                        {
                            header: "Date",
                            accessorKey: (row) => (
                                <div className="flex items-center gap-1.5 text-slate-600 text-sm font-medium">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    {row.date}
                                </div>
                            ),
                        },
                        {
                            header: "Time",
                            accessorKey: (row) => (
                                <span className="text-slate-600 text-sm font-semibold bg-slate-100 py-1 px-2.5 rounded-lg">
                                    {format12Hour(row.time)}
                                </span>
                            ),
                        },
                        {
                            header: "Device Info",
                            accessorKey: (row) => (
                                <div className="flex items-center gap-2">
                                    {getDeviceIcon(row.userAgent)}
                                    <div className="max-w-[200px]">
                                        <p className="text-sm font-medium text-slate-700 truncate" title={row.deviceName || row.userAgent}>
                                            {row.deviceName || "Web Client"}
                                        </p>
                                        {row.deviceId && (
                                            <p className="text-[10px] text-slate-400 font-mono truncate">
                                                ID: {row.deviceId}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ),
                        },
                        {
                            header: "IP Address",
                            accessorKey: (row) => (
                                <div className="flex items-center gap-1 text-slate-500 font-mono text-xs">
                                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                                    {row.ipAddress || "127.0.0.1"}
                                </div>
                            ),
                        },
                        {
                            header: "Location",
                            accessorKey: (row) => (
                                row.address ? (
                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs max-w-[200px]">
                                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate" title={row.address}>{row.address}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-xs">—</span>
                                )
                            ),
                        },
                    ]}
                />
            </div>
        </div>
    );
}

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { apiClient } from "@/hrms/services/apiClient";
import { toast } from "@/hrms/hooks/use-toast";
import { DataTable } from "@/hrms/components/common/DataTable";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import {
    Smartphone,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Shield,
    Clock,
    Trash2,
} from "lucide-react";
import { format } from "date-fns";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/hrms/components/ui/alert-dialog";

interface DeviceRequest {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
        mobile?: string;
        registeredDeviceId?: string;
        registeredDeviceName?: string;
    } | null;
    requestedDeviceId: string;
    deviceInfo?: { userAgent?: string; platform?: string; deviceName?: string };
    status: "pending" | "approved" | "rejected" | "revoked";
    createdAt: string;
}

export default function DeviceApprovalsPage() {
    const [requests, setRequests] = useState<DeviceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "revoked" | "all">("pending");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<DeviceRequest | null>(null);

    const loadRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("/users/device-approvals");
            setRequests(res?.data || []);
        } catch {
            toast({ title: "Error", description: "Failed to load device requests", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    const handleApprove = async (req: DeviceRequest) => {
        setActionLoading(req._id);
        try {
            await apiClient.patch(`/users/device-approvals/${req._id}/approve`, {});
            setRequests((prev) =>
                prev.map((r) => r._id === req._id ? { ...r, status: "approved" } : r)
            );
            toast({ title: "Device Approved", description: `${req.userId?.name || "User"} can now log in from this device.` });
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to approve", variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (req: DeviceRequest) => {
        setActionLoading(req._id);
        try {
            await apiClient.patch(`/users/device-approvals/${req._id}/reject`, {});
            setRequests((prev) =>
                prev.map((r) => r._id === req._id ? { ...r, status: "rejected" } : r)
            );
            toast({ title: "Device Rejected", description: "The login request has been rejected.", variant: "destructive" });
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to reject", variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevoke = async (req: DeviceRequest) => {
        setActionLoading(req._id);
        try {
            await apiClient.patch(`/users/device-approvals/${req._id}/revoke`, {});
            setRequests((prev) =>
                prev.map((r) => r._id === req._id ? { ...r, status: "revoked" } : r)
            );
            toast({
                title: "Device Removed",
                description: `${req.userId?.name || "This user"} can no longer log in from this device until it is re-approved.`,
            });
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to remove device", variant: "destructive" });
        } finally {
            setActionLoading(null);
            setRevokeTarget(null);
        }
    };

    const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

    const counts = {
        pending: requests.filter((r) => r.status === "pending").length,
        approved: requests.filter((r) => r.status === "approved").length,
        rejected: requests.filter((r) => r.status === "rejected").length,
        revoked: requests.filter((r) => r.status === "revoked").length,
    };

    const parseUA = (ua?: string) => {
        if (!ua) return "Unknown device";
        if (/android/i.test(ua)) return "Android";
        if (/iphone|ipad/i.test(ua)) return "iOS";
        if (/windows/i.test(ua)) return "Windows";
        if (/mac/i.test(ua)) return "Mac";
        return ua.slice(0, 30);
    };

    const deviceLabel = (r: DeviceRequest) =>
        r.deviceInfo?.deviceName || parseUA(r.deviceInfo?.userAgent);

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <PageHeader
                    title="Device Approvals"
                    subtitle="Manage employee login requests from new devices"
                />
                <Button
                    variant="outline"
                    className="rounded-2xl h-12 px-6 font-semibold gap-2"
                    onClick={loadRequests}
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
                        <p className="text-xs font-semibold text-amber-600">Pending</p>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-emerald-700">{counts.approved}</p>
                        <p className="text-xs font-semibold text-emerald-600">Approved</p>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
                        <p className="text-xs font-semibold text-red-600">Rejected</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                {(["pending", "approved", "rejected", "revoked", "all"] as const).map((tab) => (
                    <Button
                        key={tab}
                        variant={filter === tab ? "default" : "outline"}
                        size="sm"
                        className={`rounded-xl capitalize ${filter === tab ? "gradient-primary text-white border-0" : ""}`}
                        onClick={() => setFilter(tab)}
                    >
                        {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab !== "all" && (
                            <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                filter === tab ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                                {counts[tab]}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Table */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-soft">
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Device Requests</h2>
                        <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                            {filtered.length} {filter === "all" ? "Total" : filter} Requests
                        </p>
                    </div>
                </div>

                <DataTable
                    data={filtered}
                    isLoading={isLoading}
                    columns={[
                        {
                            header: "Employee",
                            accessorKey: (r) => (
                                <div>
                                    <p className="font-bold text-foreground">{r.userId?.name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{r.userId?.email}</p>
                                    {r.userId?.mobile && (
                                        <WhatsAppQuickChat phone={r.userId.mobile} data={{ customer_name: r.userId?.name }} />
                                    )}
                                </div>
                            ),
                        },
                        {
                            header: "Requesting Device",
                            accessorKey: (r) => (
                                <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4 text-amber-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{deviceLabel(r)}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                            ID: {r.requestedDeviceId?.slice(0, 16)}…
                                        </p>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            header: "Registered Device",
                            accessorKey: (r) => (
                                r.userId?.registeredDeviceId ? (
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">
                                                {r.userId.registeredDeviceName || "Registered Device"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                ID: {r.userId.registeredDeviceId?.slice(0, 16)}…
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">No device registered</span>
                                )
                            ),
                        },
                        {
                            header: "Requested",
                            accessorKey: (r) => (
                                <p className="text-sm text-muted-foreground">
                                    {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy, hh:mm a") : "—"}
                                </p>
                            ),
                        },
                        {
                            header: "Status",
                            accessorKey: (r) => (
                                <Badge
                                    variant="outline"
                                    className={
                                        r.status === "pending"
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : r.status === "approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : r.status === "revoked"
                                            ? "bg-slate-100 text-slate-600 border-slate-200"
                                            : "bg-red-50 text-red-700 border-red-200"
                                    }
                                >
                                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                </Badge>
                            ),
                        },
                        {
                            header: "Actions",
                            accessorKey: (r) => (
                                <div className="flex items-center justify-end gap-1">
                                    {r.status === "pending" && (
                                        <>
                                            <Button
                                                size="sm"
                                                disabled={actionLoading === r._id}
                                                className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white gap-1 rounded-lg"
                                                onClick={() => handleApprove(r)}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={actionLoading === r._id}
                                                className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1 rounded-lg"
                                                onClick={() => handleReject(r)}
                                            >
                                                <XCircle className="h-3.5 w-3.5" /> Reject
                                            </Button>
                                        </>
                                    )}
                                    {r.status === "approved" && (
                                        <>
                                            <span className="text-xs text-emerald-600 font-semibold">Approved ✓</span>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={actionLoading === r._id}
                                                className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 gap-1 rounded-lg"
                                                onClick={() => setRevokeTarget(r)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Remove
                                            </Button>
                                        </>
                                    )}
                                    {r.status === "rejected" && (
                                        <span className="text-xs text-red-500 font-semibold">Rejected ✗</span>
                                    )}
                                    {r.status === "revoked" && (
                                        <span className="text-xs text-slate-500 font-semibold">Removed</span>
                                    )}
                                </div>
                            ),
                        },
                    ]}
                />
            </div>

            <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove this device?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {revokeTarget?.userId?.name || "This user"} will no longer be able to log in
                            from <span className="font-semibold">{revokeTarget ? deviceLabel(revokeTarget) : "this device"}</span>.
                            If it is their currently registered device, they will need a fresh approval to log in again.
                            This keeps each employee locked to a single device.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={actionLoading === revokeTarget?._id}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            disabled={actionLoading === revokeTarget?._id}
                            onClick={(e) => { e.preventDefault(); if (revokeTarget) handleRevoke(revokeTarget); }}
                        >
                            {actionLoading === revokeTarget?._id ? "Removing…" : "Remove Device"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

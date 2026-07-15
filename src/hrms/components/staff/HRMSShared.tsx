import React from "react";
import { Card, CardContent } from "@/hrms/components/ui/card";
import { cn } from "@/hrms/lib/utils";
import { Navigation, RefreshCw, Signal, Users } from "lucide-react";
import { format } from "date-fns";

// ─── Tiny helpers ────────────────────────────────────────────────────────────

export const safeFormat = (date: any, fmt: string) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
};

export const statusColor = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "full day" || s === "present") return "emerald";
  if (s === "half day") return "amber";
  if (s === "late") return "amber";
  if (s === "absent") return "red";
  if (s === "on duty") return "blue";
  if (s === "approved") return "emerald";
  if (s === "rejected") return "red";
  if (s === "pending") return "amber";
  if (s === "paid") return "emerald";
  return "slate";
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  gradient: string;
  delta?: string;
  deltaUp?: boolean;
}

export const StatCard = ({ icon: Icon, label, value, gradient, delta, deltaUp }: StatCardProps) => (
  <Card className="relative overflow-hidden border border-white/60 bg-inherit backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 group">
    <div className={`absolute inset-0 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity ${gradient}`} />
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${gradient}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
          {delta && (
            <span className={`text-[10px] font-semibold ${deltaUp ? "text-emerald-500" : "text-red-400"}`}>
              {deltaUp ? "↑" : "↓"} {delta}
            </span>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Personnel Card (sidebar item) ──────────────────────────────────────────

interface PersonnelCardProps {
  emp: any;
  loc: any;
  isActive: boolean;
  isLive: boolean;
  isStale?: boolean;
  onClick: () => void;
  isPathLoading: boolean;
}

export const PersonnelCard = ({ emp, loc, isActive, isLive, isStale, onClick, isPathLoading }: PersonnelCardProps) => {
  const roleLabel = typeof emp.role === "string" ? emp.role : emp.role?.label || "Staff";
  const isSales = roleLabel.toLowerCase().includes("sales");
  const initials = emp.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("") || "E";
  const lastSeen = loc ? safeFormat(loc.trackedAt, "HH:mm") : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left group flex items-center gap-3 p-3 rounded-2xl border transition-all duration-150",
        isActive
          ? "bg-indigo-50 border-indigo-200 shadow-sm"
          : isStale
          ? "bg-slate-50 border-slate-200 hover:border-slate-300 opacity-75"
          : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold overflow-hidden border-2",
          isActive ? "border-indigo-200" : isStale ? "border-slate-200" : "border-slate-100"
        )}>
          {emp.avatar ? (
            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
          ) : (
            <div className={cn("w-full h-full flex items-center justify-center text-white text-xs font-bold",
              isActive ? "bg-indigo-500" : isStale ? "bg-slate-400" : "bg-slate-400"
            )}>
              {initials}
            </div>
          )}
        </div>
        {loc && (
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
            isLive ? "bg-emerald-400 animate-pulse" : isStale ? "bg-slate-400" : "bg-slate-300"
          )} />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className={cn("text-sm font-semibold truncate", isActive ? "text-indigo-700" : "text-slate-700")}>
            {emp.name}
          </p>
          {isStale && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">⚠ Stale</span>
          )}
          {!isStale && isSales && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md">Sales</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className={cn("text-[11px] font-medium truncate", isActive ? "text-indigo-500" : "text-slate-400")}>
            {loc ? (isLive ? "● Live now" : `Last seen ${lastSeen}`) : "Offline"}
          </p>
          {loc?.totalDistance > 0 && (
            <span className="text-[10px] font-bold text-slate-500 tabular-nums">
              {(loc.totalDistance / 1000).toFixed(1)} km
            </span>
          )}
        </div>
      </div>

      {/* Status icon */}
      <div className="shrink-0">
        {isPathLoading && isActive ? (
          <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
        ) : loc ? (
          <Navigation className={cn("h-4 w-4 transition-colors", isActive ? "text-indigo-500" : "text-slate-300 group-hover:text-slate-400")} />
        ) : (
          <Signal className="h-4 w-4 text-slate-200" />
        )}
      </div>
    </button>
  );
};

// ─── Tracking Info Pill ──────────────────────────────────────────────────────

export const InfoPill = ({ icon: Icon, label, value, color = "slate" }: { icon: React.ElementType; label: string; value: string; color?: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">{label}</span>
    <div className="flex items-center gap-1">
      <Icon className={`h-3.5 w-3.5 text-${color}-500`} />
      <span className="text-[11px] font-bold text-slate-700">{value}</span>
    </div>
  </div>
);

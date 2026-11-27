// Work-day timer (Start / Pause / Resume / Stop Work) and the task timer.
// Both live on the server, so they keep counting across page changes, a
// refresh, other tabs and other devices. While the CRM is open a heartbeat is
// sent every minute; with no heartbeat for 15 minutes the server closes the
// work day at the last heartbeat (CRM closed / went home without Stop Work).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { utilityService } from "@/api/services/utility.service";
import { usePermissionContext } from "@/context/PermissionContext";

export type WorkStatus = {
  serverNow: string;
  session: { _id: string; start: string; status: "running" | "paused"; breakStart: string | null } | null;
  today: {
    date: string;
    workedSeconds: number;
    breakSeconds: number;
    firstStart: string | null;
    lastEnd: string | null;
    sessions: { _id: string; start: string; end: string | null; status: string; endedBy: string | null; breaks: { start: string; end: string | null }[] }[];
  };
  taskTimer: { taskId: string; taskName: string; project: string; start: string } | null;
};

type Ctx = {
  enabled: boolean;
  status: WorkStatus | null;
  loading: boolean;
  /** Server time now (corrected for the browser clock), ms. */
  now: () => number;
  /** Seconds worked today including the running part (updates every second where used). */
  workedToday: (atMs?: number) => number;
  busy: boolean;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: (reason?: "logout") => Promise<void>;
  startTask: (taskId: string) => Promise<void>;
  stopTask: () => Promise<any>;
  refresh: () => Promise<any>;
};

const WorkTimerContext = createContext<Ctx | null>(null);
const KEY = ["work-status"];
const HEARTBEAT_MS = 60 * 1000;

export function WorkTimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = usePermissionContext();
  const qc = useQueryClient();
  const hasToken = (() => { try { return !!localStorage.getItem("crm_token"); } catch { return false; } })();
  // Staff accounts of a company (super admin has no work day).
  const enabled = !!user && hasToken && !user.is_superadmin;
  const [busy, setBusy] = useState(false);
  const offset = useRef(0); // server - browser clock, ms

  const q = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const r: any = await utilityService.workStatus();
      if (r?.serverNow) offset.current = new Date(r.serverNow).getTime() - Date.now();
      return r as WorkStatus;
    },
    enabled,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const status = enabled ? q.data ?? null : null;
  const open = !!status?.session;

  // Heartbeat every minute while a work day is open (also from a background tab).
  useEffect(() => {
    if (!enabled || !open) return;
    const beat = () => utilityService.workHeartbeat().catch(() => {});
    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [enabled, open]);

  const now = useCallback(() => Date.now() + offset.current, []);
  const workedToday = useCallback((atMs?: number) => {
    if (!status) return 0;
    const t = atMs ?? now();
    const base = status.today.workedSeconds;
    // today's total was computed at serverNow; add what ran since then (not during a break)
    const since = Math.max(0, Math.floor((t - new Date(status.serverNow).getTime()) / 1000));
    return base + (status.session?.status === "running" ? since : 0);
  }, [status, now]);

  const act = useCallback(async (fn: () => Promise<any>) => {
    setBusy(true);
    try {
      const r: any = await fn();
      if (r?.serverNow) {
        offset.current = new Date(r.serverNow).getTime() - Date.now();
        qc.setQueryData(KEY, r);
      } else {
        await qc.invalidateQueries({ queryKey: KEY });
      }
      return r;
    } finally {
      setBusy(false);
    }
  }, [qc]);

  const value = useMemo<Ctx>(() => ({
    enabled,
    status,
    loading: q.isLoading,
    now,
    workedToday,
    busy,
    start: () => act(utilityService.workStart),
    pause: () => act(utilityService.workPause),
    resume: () => act(utilityService.workResume),
    stop: (reason) => act(() => utilityService.workStop(reason)),
    startTask: (taskId) => act(() => utilityService.taskTimerStart(taskId)),
    stopTask: () => act(utilityService.taskTimerStop),
    refresh: () => q.refetch(),
  }), [enabled, status, q, now, workedToday, busy, act]);

  return <WorkTimerContext.Provider value={value}>{children}</WorkTimerContext.Provider>;
}

const OFF: Ctx = {
  enabled: false, status: null, loading: false, now: () => Date.now(), workedToday: () => 0, busy: false,
  start: async () => {}, pause: async () => {}, resume: async () => {}, stop: async () => {},
  startTask: async () => {}, stopTask: async () => null, refresh: async () => null,
};
/** Work timer state + actions. Outside the provider it is switched off. */
export const useWorkTimer = () => useContext(WorkTimerContext) ?? OFF;

/** Re-renders every second while `active` (for running clocks). */
export const useTick = (active: boolean) => {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => set((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
};

/** 2:05:09 / 05:09 */
export const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

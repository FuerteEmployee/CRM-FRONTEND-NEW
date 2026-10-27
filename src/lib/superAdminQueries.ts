// Cached data for the Super Admin panel (React Query). Pages that need the
// same data share one request, revisiting a page shows the cached copy at
// once while it refreshes quietly, and a save invalidates everything under
// SA_KEY so every page picks up the change.
import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/api/client";

export const SA_KEY = ["super-admin"] as const;
const STALE_MS = 60 * 1000;

export type TenantListParams = { page: number; limit: number; search?: string; status?: string };

const fetchDashboard = async () => {
  const res: any = await api.get("/super-admin/dashboard");
  // The api client turns a 404/network failure into [] — that's not data.
  if (!res || Array.isArray(res)) throw new Error("No response from server");
  return res;
};
const fetchAllTenants = async () => {
  const res: any = await api.get("/super-admin/tenants");
  return Array.isArray(res) ? res : [];
};
const fetchTenantPage = (params: TenantListParams) => api.get("/super-admin/tenants", { params }) as Promise<any>;
const fetchPlans = async () => {
  const res: any = await api.get("/super-admin/plans");
  return Array.isArray(res) ? res : [];
};
const fetchDismissedAlerts = async () => {
  const res: any = await api.get("/super-admin/alerts/dismissed");
  return Array.isArray(res) ? (res as string[]) : [];
};

export const saQueries = {
  dashboard: { queryKey: [...SA_KEY, "dashboard"], queryFn: fetchDashboard, staleTime: STALE_MS },
  allTenants: { queryKey: [...SA_KEY, "tenants", "all"], queryFn: fetchAllTenants, staleTime: STALE_MS },
  plans: { queryKey: [...SA_KEY, "plans"], queryFn: fetchPlans, staleTime: STALE_MS },
  dismissedAlerts: { queryKey: [...SA_KEY, "alerts", "dismissed"], queryFn: fetchDismissedAlerts, staleTime: STALE_MS },
};

export const useSaDashboard = () => useQuery(saQueries.dashboard);
export const useSaAllTenants = () => useQuery(saQueries.allTenants);
export const useSaPlans = () => useQuery(saQueries.plans);
export const useSaDismissedAlerts = () => useQuery(saQueries.dismissedAlerts);

// Customer table: keeps the previous page's rows on screen while the next
// page/search loads, instead of blanking the table.
export const useSaTenantPage = (params: TenantListParams) =>
  useQuery({
    queryKey: [...SA_KEY, "tenants", "page", params],
    queryFn: () => fetchTenantPage(params),
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });

/** Refetch every Super Admin query (after a create/edit/renew/suspend/dismiss). */
export const useInvalidateSa = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SA_KEY });
};

/** Start loading a page's data when its sidebar link is hovered. */
export const prefetchSaPage = (qc: QueryClient, path: string) => {
  const first: TenantListParams = { page: 1, limit: 25 };
  const byPath: Record<string, () => unknown> = {
    "/super-admin/dashboard": () => qc.prefetchQuery(saQueries.dashboard),
    "/super-admin/companies": () => {
      qc.prefetchQuery({ queryKey: [...SA_KEY, "tenants", "page", first], queryFn: () => fetchTenantPage(first), staleTime: STALE_MS });
      qc.prefetchQuery(saQueries.plans);
    },
    "/super-admin/plans": () => qc.prefetchQuery(saQueries.plans),
    "/super-admin/billing": () => {
      qc.prefetchQuery(saQueries.allTenants);
      qc.prefetchQuery(saQueries.dashboard);
    },
    "/super-admin/alerts": () => {
      qc.prefetchQuery(saQueries.allTenants);
      qc.prefetchQuery(saQueries.dismissedAlerts);
    },
  };
  byPath[path]?.();
};

// One skeleton rule for every Super Admin page: shown only while the page's
// data is actually loading (never for cached data), and for at least
// SKELETON_MIN_MS so a fast load doesn't flicker.
const SKELETON_MIN_MS = 300;
export const useSaSkeleton = (pending: boolean) => {
  const [show, setShow] = useState(pending);
  const startedAt = useRef(pending ? Date.now() : 0);
  useEffect(() => {
    if (pending) {
      if (!startedAt.current) startedAt.current = Date.now();
      setShow(true);
      return;
    }
    if (!startedAt.current) {
      setShow(false);
      return;
    }
    const left = Math.max(0, SKELETON_MIN_MS - (Date.now() - startedAt.current));
    const t = setTimeout(() => {
      startedAt.current = 0;
      setShow(false);
    }, left);
    return () => clearTimeout(t);
  }, [pending]);
  return show;
};

/**
 * Checks whether the current deployment / tenant has the Purchase Procurement Types module active.
 * STRICT TENANT ISOLATION:
 * This module is exclusively for Kiran Engineering (or when deploying a dedicated build for Kiran).
 * Other tenants (e.g. Fuerte, Trinetra, City Smile, Herbal King, etc.) must NEVER see
 * these procurement types or category hierarchy.
 */
export const isProcurementTypesEnabled = (user?: any): boolean => {
  // 1. Explicit URL parameter override (for developer override testing: ?kiran=true or ?kiran=false)
  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("kiran") === "false") return false;
    if (searchParams.get("kiran") === "true" || searchParams.get("tenant") === "kiran") return true;

    // 2. Dedicated Kiran production domain or subdomain
    const host = window.location.hostname.toLowerCase();
    if (host.includes("kiranenginers.com") || host.includes("kiran")) {
      return true;
    }
  }

  // 3. Dedicated build mode (vite build --mode kiran) or dedicated site URL
  const mode = import.meta.env.MODE;
  if (mode === "kiran") {
    return true;
  }
  const siteUrl = import.meta.env.VITE_SITE_URL || "";
  if (siteUrl.includes("kiranenginers.com") || siteUrl.includes("kiran")) {
    return true;
  }

  // 4. Resolve the active logged-in user
  let currentUser = user;
  if (!currentUser && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("crm_user");
      if (raw) currentUser = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  // 5. Tenant-specific check: ONLY Kiran Engineering tenant or tenants with procurement_types enabled
  if (currentUser) {
    const company = String(currentUser?.tenant?.company_name || currentUser?.company_name || "").toLowerCase();
    const subdomain = String(currentUser?.tenant?.subdomain || "").toLowerCase();
    const email = String(currentUser?.email || "").toLowerCase();
    const features = Array.isArray(currentUser?.tenant?.enabled_features)
      ? currentUser.tenant.enabled_features
      : [];

    if (company.includes("kiran") || subdomain.includes("kiran") || email.includes("kiran")) {
      return true;
    }

    if (features.includes("procurement_types")) {
      return true;
    }

    // Any other tenant -> strictly false
    return false;
  }

  return false;
};

export const PROCUREMENT_TYPES = [
  { id: "ALL", label: "All Types" },
  { id: "READY", label: "Ready to Use" },
  { id: "JOBWORK", label: "Job Work" },
  { id: "MANUFACTURE", label: "Manufacturing by Self" },
] as const;

export type ProcurementType = "READY" | "JOBWORK" | "MANUFACTURE";

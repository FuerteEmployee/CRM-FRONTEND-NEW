// Single source of truth for auth tokens, silent refresh and session-expiry
// handling. Both the CRM client (api/client.js) and the HRMS client
// (hrms/services/apiClient.ts) go through this so they can never disagree
// about where the token lives or how to renew it.

const CRM_API_URL: string = (import.meta as any).env?.VITE_API_URL ?? "/api";

const ACCESS_KEY = "crm_token";
const REFRESH_KEY = "crm_refresh_token";

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const getAccessToken = (): string | null => safeGet(ACCESS_KEY);
export const getRefreshToken = (): string | null => safeGet(REFRESH_KEY);

export const setTokens = (access?: string | null, refresh?: string | null) => {
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage unavailable */
  }
};

/** Decode the JWT `exp` claim (seconds) without verifying the signature. */
export const getTokenExpiry = (token: string): number | null => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
};

/** True when the token is expired or within `skewMs` of expiring. */
export const isTokenExpired = (token: string, skewMs = 60_000): boolean => {
  const exp = getTokenExpiry(token);
  if (exp === null) return false;
  return exp * 1000 < Date.now() + skewMs;
};

// ─── Silent refresh ───────────────────────────────────────────────────────────

// One shared promise so every concurrent request waits for the same refresh
// call instead of each firing its own (the refresh token rotates on every use).
let refreshPromise: Promise<boolean> | null = null;

/**
 * Exchange the stored refresh token for a new access token.
 * Resolves true only if a new access token was actually stored.
 */
export const refreshAccessToken = (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;

      const res = await fetch(`${CRM_API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      if (!data?.token) return false;
      setTokens(data.token, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ─── Session expiry ───────────────────────────────────────────────────────────

const SESSION_KEYS = [
  ACCESS_KEY,
  REFRESH_KEY,
  "crm_user",
  "crm_permissions",
  "crm_plan_modules",
  "std_user",
];

/** Pick the login page that matches whoever was signed in. */
const loginPathForStoredUser = (): string => {
  try {
    const user = JSON.parse(safeGet("crm_user") || "null");
    if (user?.is_superadmin) return "/super-admin/login";
    if (user && !user.admin) return "/staff/login";
  } catch {
    /* fall through */
  }
  return "/admin/login";
};

export const SESSION_EXPIRED_PATH = "/session-expired";

let expiring = false;

/**
 * Clear every stored credential and send the user to the "session expired"
 * page, which links on to the right login screen. Safe to call many times —
 * parallel failing requests only trigger one redirect.
 */
export const handleSessionExpired = () => {
  if (expiring) return;

  const here = window.location.pathname;
  const publicPaths = [SESSION_EXPIRED_PATH, "/login", "/admin/login", "/staff/login", "/super-admin/login", "/client/login"];
  if (publicPaths.includes(here)) return; // already somewhere safe

  expiring = true;
  const loginPath = loginPathForStoredUser();
  SESSION_KEYS.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });

  const params = new URLSearchParams({ login: loginPath, from: here + window.location.search });
  window.location.replace(`${SESSION_EXPIRED_PATH}?${params.toString()}`);
};

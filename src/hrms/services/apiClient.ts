import { toast } from "@/hrms/hooks/use-toast";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface FetchOptions extends RequestInit {
  data?: any;
  params?: Record<string, any>;
  silent?: boolean;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export const getAuthToken = (): string | null => {
  try {
    const crmToken = localStorage.getItem("crm_token");
    if (crmToken) return crmToken;

    const userStr = localStorage.getItem("std_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.token || null;
    }
  } catch (error) {
    console.warn("Failed to parse token from localStorage", error);
  }
  return null;
};

const updateStoredToken = (token: string) => {
  try {
    const userStr = localStorage.getItem("std_user");
    if (userStr) {
      const u = JSON.parse(userStr);
      u.token = token;
      localStorage.setItem("std_user", JSON.stringify(u));
    }
  } catch { /* ignore */ }
};

/** Decode JWT exp claim client-side (no signature verification needed). */
const getTokenExpiry = (token: string): number | null => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
};

/** True when the token is expired or within 60 seconds of expiring. */
const isTokenExpired = (token: string): boolean => {
  const exp = getTokenExpiry(token);
  if (exp === null) return false;
  return exp * 1000 < Date.now() + 60_000;
};

// ─── Refresh + logout ─────────────────────────────────────────────────────────

let _loggingOut = false;
const forceLogout = () => {
  if (_loggingOut) return;
  _loggingOut = true;
  localStorage.removeItem("std_user");
  toast({ title: "Session Expired", description: "Please log in again.", variant: "destructive" });
  setTimeout(() => { window.location.href = "/login"; }, 1200);
};

// One shared promise so every concurrent request waits for the same refresh call
// instead of each firing its own, which would rotate the refresh token multiple times.
let _refreshPromise: Promise<boolean> | null = null;

const attemptRefresh = (): Promise<boolean> => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const currentToken = getAuthToken();
      if (!currentToken) return false;

      const res = await fetch(`${API_BASE_URL}/users/refresh`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentToken}` },
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.token) {
        updateStoredToken(data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

// ─── Core request ─────────────────────────────────────────────────────────────

const _request = async (endpoint: string, method: HttpMethod, options: FetchOptions = {}): Promise<any> => {
  const { data, headers, ...rest } = options;
  let token = getAuthToken();

  // Pre-flight: if the token is expired, try to refresh silently before sending
  if (token && isTokenExpired(token)) {
    const refreshed = await attemptRefresh();
    if (!refreshed) {
      forceLogout();
      throw new Error("Unauthorized");
    }
    token = getAuthToken(); // pick up the newly written token
  }

  const isFormData = data instanceof FormData;
  const defaultHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Query parameters
  let finalEndpoint = endpoint;
  const urlParams = new URLSearchParams();

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        urlParams.append(key, String(value));
      }
    });
  }

  const queryStr = urlParams.toString();
  if (queryStr) {
    const separator = finalEndpoint.includes("?") ? "&" : "?";
    finalEndpoint += `${separator}${queryStr}`;
  }

  // Cache-busting for GET
  if (method === "GET") {
    const separator = finalEndpoint.includes("?") ? "&" : "?";
    finalEndpoint += `${separator}_t=${Date.now()}`;
  }

  const response = await fetch(`${API_BASE_URL}${finalEndpoint}`, {
    method,
    headers: { ...defaultHeaders, ...headers },
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    ...rest,
  });

  // 401 received from server — try refresh once, then retry the original request
  if (response.status === 401 && token) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry with the new access token (will re-read from localStorage)
      return _request(endpoint, method, options);
    }
    forceLogout();
    throw new Error("Unauthorized");
  }

  if (response.status === 401) {
    throw new Error("Unauthorized");
  }

  const text = await response.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response: ${text}`);
  }

  if (!response.ok) {
    const msg = json.message || json.error || `API Error: ${response.status} ${response.statusText}`;
    if (!options.silent && response.status !== 404) {
      toast({ title: "Server Communication Error", description: msg, variant: "destructive" });
    }
    throw new Error(msg);
  }

  return json;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const apiClient = {
  get: <T = any>(endpoint: string, options?: FetchOptions): Promise<{ data: T; success: boolean;[key: string]: any }> =>
    _request(endpoint, "GET", options),
  post: <T = any>(endpoint: string, data?: any, options?: FetchOptions): Promise<{ data: T; success: boolean;[key: string]: any }> =>
    _request(endpoint, "POST", { ...options, data }),
  patch: <T = any>(endpoint: string, data?: any, options?: FetchOptions): Promise<{ data: T; success: boolean;[key: string]: any }> =>
    _request(endpoint, "PATCH", { ...options, data }),
  put: <T = any>(endpoint: string, data?: any, options?: FetchOptions): Promise<{ data: T; success: boolean;[key: string]: any }> =>
    _request(endpoint, "PUT", { ...options, data }),
  delete: (endpoint: string, options?: FetchOptions): Promise<{ success: boolean; message: string }> =>
    _request(endpoint, "DELETE", options),
};

export default apiClient;

import { toast } from "@/hrms/hooks/use-toast";
import { getAccessToken, refreshAccessToken, handleSessionExpired, isTokenExpired, TENANT_BLOCK_CODES } from "@/lib/session";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface FetchOptions extends RequestInit {
  data?: any;
  params?: Record<string, any>;
  silent?: boolean;
}

// ─── Token helpers ────────────────────────────────────────────────────────────
// A CRM login keeps its tokens in crm_token / crm_refresh_token; the standalone
// HRMS login keeps them in std_user. Both are supported, and a refreshed token
// is always written back to whichever store it came from.

export const getAuthToken = (): string | null => {
  const crmToken = getAccessToken();
  if (crmToken) return crmToken;
  try {
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

const updateStdUserToken = (token: string): boolean => {
  try {
    const userStr = localStorage.getItem("std_user");
    if (!userStr) return false;
    const u = JSON.parse(userStr);
    u.token = token;
    localStorage.setItem("std_user", JSON.stringify(u));
    return true;
  } catch {
    return false;
  }
};

// ─── Refresh + logout ─────────────────────────────────────────────────────────

const forceLogout = () => {
  handleSessionExpired();
};

// One shared promise so every concurrent request waits for the same refresh call.
let _refreshPromise: Promise<boolean> | null = null;

const attemptRefresh = (): Promise<boolean> => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      // CRM session → use the CRM refresh token.
      if (getAccessToken()) {
        return await refreshAccessToken();
      }

      // Standalone HRMS session → legacy /users/refresh using the std_user token.
      const currentToken = getAuthToken();
      if (!currentToken) return false;

      const res = await fetch(`${API_BASE_URL}/users/refresh`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${currentToken}` },
      });
      if (!res.ok) return false;

      const data = await res.json();
      // Only report success if the new token was really stored — otherwise the
      // caller would retry with the same stale token forever.
      return !!(data.token && updateStdUserToken(data.token));
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
};

// ─── Core request ─────────────────────────────────────────────────────────────

const _request = async (endpoint: string, method: HttpMethod, options: FetchOptions = {}, _retried = false): Promise<any> => {
  const { data, headers, ...rest } = options;
  let token = getAuthToken();

  // Pre-flight: if the token is expired, try to refresh silently before sending
  if (token && !_retried && isTokenExpired(token)) {
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

  // Suspended / deleted company (backend utils/tenantAccess.js): refreshing
  // can't help — sign out to the "account suspended" screen.
  if (response.status === 401 || response.status === 403) {
    const peek = await response.clone().json().catch(() => ({}));
    const blockReason = TENANT_BLOCK_CODES[peek?.code];
    if (blockReason) {
      handleSessionExpired(blockReason);
      throw new Error(peek.message || "Company account blocked");
    }
  }

  // 401 received from server — try refresh once, then retry the original request
  if (response.status === 401 && token) {
    // Retry at most once — a second 401 means the session is really gone.
    const refreshed = _retried ? false : await attemptRefresh();
    if (refreshed) {
      // Retry with the new access token (will re-read from localStorage)
      return _request(endpoint, method, options, true);
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
    // Attach full server response body on the error so callers can inspect
    // fields like geoFenceViolation, distance, allowedRadius, etc.
    const err: any = new Error(msg);
    err.responseData = json;
    err.status = response.status;
    throw err;
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

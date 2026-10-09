import {
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  refreshAccessToken,
  handleSessionExpired,
  TENANT_BLOCK_CODES,
} from "@/lib/session";

// Fall back to the Vite dev proxy path (same as lib/session.ts) so a missing
// .env doesn't produce requests to "<page>/undefined/...".
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Endpoints where a 401 means "wrong credentials", not "session expired".
const AUTH_ENDPOINTS = ["/auth/login", "/auth/verify-2fa", "/auth/refresh", "/auth/logout"];

class ApiClient {
  async request(endpoint, options = {}, _retried = false) {
    const isFormData = options.body && typeof options.body.append === 'function';
    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p));

    // Pre-flight: renew a token that is expired / about to expire before using it.
    if (!isAuthEndpoint && !_retried) {
      const current = getAccessToken();
      if (current && isTokenExpired(current) && getRefreshToken()) {
        await refreshAccessToken();
      }
    }

    const token = getAccessToken();
    const userStr = localStorage.getItem("crm_user");
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const headers = {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(token && { "Authorization": `Bearer ${token}` }),
      // Pass admin/tenant ID so the backend can scope data to the right tenant
      ...(currentUser?._id && { "X-Admin-ID": currentUser._id }),
      ...(currentUser?.tenant?._id && { "X-Tenant-ID": currentUser.tenant._id }),
      ...options.headers,
    };

    if (isFormData && (headers["Content-Type"] || headers["content-type"])) {
      delete headers["Content-Type"];
      delete headers["content-type"];
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    // Expired / invalid token: renew once and replay the request; if that fails,
    // clear the session and show the "session expired" page instead of leaving
    // the user on a blank screen.
    if (response.status === 401 && !isAuthEndpoint) {
      // A deleted company's login can't be fixed by refreshing the token.
      const peek = await response.clone().json().catch(() => ({}));
      if (TENANT_BLOCK_CODES[peek.code]) {
        handleSessionExpired(TENANT_BLOCK_CODES[peek.code]);
      } else if (!_retried && getRefreshToken() && (await refreshAccessToken())) {
        return this.request(endpoint, options, true);
      }
      if (token || getRefreshToken()) handleSessionExpired();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Suspended / deleted company: sign out to the "account suspended" screen.
      const blockReason = TENANT_BLOCK_CODES[errorData.code];
      if (blockReason && !isAuthEndpoint && (token || getRefreshToken())) handleSessionExpired(blockReason);
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      // NB: spreading a fetch Response does NOT copy `status`/`statusText` (they
      // are prototype getters), which made every status check downstream
      // (`error.response.status === 401`, `>= 500`, ...) silently false.
      error.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: errorData,
      };
      error.status = response.status;
      throw error;
    }

    return response.json();
  }

  async get(endpoint, options) {
    try {
      // Callers pass `{ params: {...} }` expecting axios-style query-string
      // serialization (e.g. salesService.getProposals({ rel_id, rel_type })) —
      // build that querystring here since `fetch` has no concept of `params`
      // and would otherwise silently ignore it, returning unfiltered data.
      const { params, ...rest } = options || {};
      let url = endpoint;
      if (params && typeof params === "object") {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") query.append(key, value);
        });
        const qs = query.toString();
        if (qs) url += (endpoint.includes("?") ? "&" : "?") + qs;
      }
      const result = await this.request(url, { ...rest, method: "GET" });
      // Deduplicate array responses by _id so backend duplicates never reach the UI.
      if (Array.isArray(result)) {
        const seen = new Set();
        return result.filter(item => {
          const key = item._id ?? item.id;
          if (key == null) return true;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return result;
    } catch (error) {
      const status = error?.response?.status;
      // Re-throw auth errors so route guards can redirect to login.
      if (status === 401 || status === 403) throw error;
      // Re-throw server errors (e.g. the backend's transient 503 "database not
      // connected yet" during cold start) so React Query sees a real failure and
      // retries once the DB is up, instead of caching an empty [] forever.
      if (status >= 500) throw error;
      // Other 4xx (400/422/etc.) are real failures too — returning [] made a
      // failed request look like "no data" (blank lists). Only a plain 404
      // ("nothing here") is treated as empty.
      if (status && status !== 404) throw error;
      return [];
    }
  }

  post(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  put(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  patch(endpoint, data, options) {
    return this.request(endpoint, {
      ...options,
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();

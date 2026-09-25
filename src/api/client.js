const BASE_URL = import.meta.env.VITE_API_URL;

class ApiClient {
  async request(endpoint, options = {}) {
    const isFormData = options.body && typeof options.body.append === 'function';
    const token = localStorage.getItem("crm_token");
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      error.response = { ...response, data: errorData };
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
      // Re-throw auth errors so route guards can redirect to login.
      const status = error?.response?.status;
      if (status === 401 || status === 403) throw error;
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

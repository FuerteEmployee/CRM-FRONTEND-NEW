// const BASE_URL = "http://localhost:5000/api";

const BASE_URL = "https://crm-backend-1-qurl.onrender.com";

class ApiClient {
  async request(endpoint, options = {}) {
    const isFormData = options.body && typeof options.body.append === 'function';
    const headers = {
      ...(!isFormData && { "Content-Type": "application/json" }),
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

  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: "GET" });
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

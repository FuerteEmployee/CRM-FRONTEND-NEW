import { apiClient } from "../client";

// Saved bell / Dashboard notifications of the logged-in staff member
// (Backend routes/notification_routes.js).
export const notificationService = {
  list: async (limit = 30) => {
    const res = await apiClient.get(`/notifications?limit=${limit}`);
    return { items: Array.isArray(res?.items) ? res.items : [], unread: Number(res?.unread) || 0 };
  },
  /** Only for notifications the browser creates: type "meeting" | "approval_summary". */
  create: (data) => apiClient.post("/notifications", data),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.put("/notifications/read-all", {}),
  remove: (id) => apiClient.delete(`/notifications/${id}`),
};

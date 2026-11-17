import { apiClient } from "../client";

// Saved bell / Dashboard notifications of the logged-in staff member
// (Backend routes/notification_routes.js).
export const notificationService = {
  /**
   * Newest first. `before` (ISO date) = the next page after the oldest one shown;
   * `opts.unread` = unread only; `opts.type` = one kind (task, chat, reminder…).
   */
  list: async (limit = 10, before, opts = {}) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (before) p.set("before", before);
    if (opts.unread) p.set("unread", "1");
    if (opts.type) p.set("type", opts.type);
    const res = await apiClient.get(`/notifications?${p.toString()}`);
    const items = Array.isArray(res?.items) ? res.items : [];
    return { items, unread: Number(res?.unread) || 0, hasMore: typeof res?.hasMore === "boolean" ? res.hasMore : items.length >= limit };
  },
  /** Only for notifications the browser creates: type "meeting" | "approval_summary". */
  create: (data) => apiClient.post("/notifications", data),
  markRead: (id) => apiClient.put(`/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.put("/notifications/read-all", {}),
  remove: (id) => apiClient.delete(`/notifications/${id}`),
};

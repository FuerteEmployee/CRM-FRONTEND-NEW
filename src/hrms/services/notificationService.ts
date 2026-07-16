import { Notification } from "@/hrms/types";
import { apiClient } from "./apiClient";

// Map a backend notification document to the frontend Notification shape.
const SEVERITY_TO_TYPE: Record<string, Notification["type"]> = {
  critical: "error",
  warning: "warning",
  info: "info",
  success: "success",
};

const mapNotification = (n: any): Notification => ({
  id: n._id || n.id,
  title: n.title || "Notification",
  message: n.body || n.message || "",
  type: SEVERITY_TO_TYPE[n.severity] || "info",
  read: n.isRead ?? n.read ?? false,
  createdAt: n.createdAt || new Date().toISOString(),
});

export const notificationService = {
  getAll: async (): Promise<Notification[]> => {
    try {
      const res = await apiClient.get("/notifications", { params: { limit: 50 }, silent: true });
      return ((res.data as any[]) || []).map(mapNotification);
    } catch {
      return [];
    }
  },

  getUnreadCount: async (): Promise<number> => {
    try {
      const res = await apiClient.get("/notifications/unread-count", { silent: true });
      return res.count || 0;
    } catch {
      return 0;
    }
  },

  markRead: async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {}, { silent: true });
    } catch {
      /* ignore */
    }
  },

  markAllRead: async (): Promise<void> => {
    try {
      await apiClient.patch("/notifications/read-all", {}, { silent: true });
    } catch {
      /* ignore */
    }
  },
};

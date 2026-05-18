import { apiClient } from "@/api/client";

export const announcementService = {
  getAnnouncements: () => apiClient.get("/announcements"),
  getAnnouncement: (id: string) => apiClient.get(`/announcements/${id}`),
  createAnnouncement: (data: any) => apiClient.post("/announcements", data),
  updateAnnouncement: (id: string, data: any) => apiClient.put(`/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => apiClient.delete(`/announcements/${id}`),
};

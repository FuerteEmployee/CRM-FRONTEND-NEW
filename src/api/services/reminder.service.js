import { apiClient } from "../client";

export const reminderService = {
  getReminders: (relId, relType) => apiClient.get(`/reminders?rel_id=${relId}&rel_type=${relType}`),
  createReminder: (data) => apiClient.post("/reminders", data),
  updateReminder: (id, data) => apiClient.put(`/reminders/${id}`, data),
  deleteReminder: (id) => apiClient.delete(`/reminders/${id}`),
};

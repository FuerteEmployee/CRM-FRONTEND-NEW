import { apiClient } from "../client";

export const reminderService = {
  getReminders: (relId, relType) => apiClient.get(`/reminders?rel_id=${relId}&rel_type=${relType}`),
  createReminder: (data) => apiClient.post("/reminders", data),
  deleteReminder: (id) => apiClient.delete(`/reminders/${id}`),
};

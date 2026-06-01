import { apiClient } from '../client';

export const timeEntryService = {
  getTimeEntries: () => apiClient.get('/time-entries'),
  createTimeEntry: (data) => apiClient.post('/time-entries', data),
  updateTimeEntry: (id, data) => apiClient.put(`/time-entries/${id}`, data),
  deleteTimeEntry: (id) => apiClient.delete(`/time-entries/${id}`),
};

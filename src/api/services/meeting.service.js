import { apiClient } from '../client';

export const meetingService = {
  getMeetings: () => apiClient.get('/meetings'),
  getMeeting: (id) => apiClient.get(`/meetings/${id}`),
  createMeeting: (data) => apiClient.post('/meetings', data),
  updateMeeting: (id, data) => apiClient.put(`/meetings/${id}`, data),
  deleteMeeting: (id) => apiClient.delete(`/meetings/${id}`),
};

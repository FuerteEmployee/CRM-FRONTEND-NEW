import { apiClient } from '../client';

export const calendarEventService = {
  getEvents: () => apiClient.get('/calendar-events'),
  // Invoice/estimate/task… dates + reminders (Setup > Settings > Calendar).
  getFeed: (start, end) => apiClient.get(`/calendar-events/feed?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  createEvent: (data) => apiClient.post('/calendar-events', data),
  updateEvent: (id, data) => apiClient.put(`/calendar-events/${id}`, data),
  deleteEvent: (id) => apiClient.delete(`/calendar-events/${id}`),
};

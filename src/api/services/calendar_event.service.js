import { apiClient } from '../client';

export const calendarEventService = {
  getEvents: () => apiClient.get('/calendar-events'),
  createEvent: (data) => apiClient.post('/calendar-events', data),
  updateEvent: (id, data) => apiClient.put(`/calendar-events/${id}`, data),
  deleteEvent: (id) => apiClient.delete(`/calendar-events/${id}`),
};

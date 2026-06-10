import { apiClient } from '../client';

export const mainSidebarService = {
  getSidebarItems: () => apiClient.get('/mainsidebar'),
  createSidebarItem: (data) => apiClient.post('/mainsidebar', data),
  updateSidebarItem: (id, data) => apiClient.put(`/mainsidebar/${id}`, data),
  deleteSidebarItem: (id) => apiClient.delete(`/mainsidebar/${id}`),
};

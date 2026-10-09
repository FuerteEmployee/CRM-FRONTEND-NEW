import { apiClient } from '../client';

export const bookmarkService = {
  getBookmarks: async () => {
    return apiClient.get('/bookmarks');
  },
  
  deleteBookmark: async (id) => {
    return apiClient.delete(`/bookmarks/${id}`);
  },

  deleteAllBookmarks: async () => {
    return apiClient.delete('/bookmarks');
  },
  
  updateBookmark: async (id, data) => {
    return apiClient.put(`/bookmarks/${id}`, data);
  },
  
  createBookmark: async (data) => {
    return apiClient.post('/bookmarks', data);
  }
};

import { apiClient } from '../client';

export const bookmarkService = {
  getBookmarks: async () => {
    return apiClient.get('/bookmarks');
  },
  
  deleteBookmark: async (id) => {
    return apiClient.delete(`/bookmarks/${id}`);
  }
};

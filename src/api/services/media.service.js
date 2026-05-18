import { apiClient } from "../client";

export const mediaService = {
  getMedia: (path = "") => apiClient.get(`/media?path=${encodeURIComponent(path)}`),
  uploadFile: (file, path = "") => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(`/media/upload?path=${encodeURIComponent(path)}`, formData);
  },
  createFolder: (name, path = "") => apiClient.post("/media/folder", { name, path }),
  deleteItem: (name, path = "") => apiClient.delete("/media", { data: { name, path } }),
};

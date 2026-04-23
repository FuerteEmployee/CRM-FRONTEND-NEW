import { apiClient } from "../client";

export const noteService = {
  getAll: (rel_id, rel_type = "customer") => 
    apiClient.get(`/notes?rel_id=${rel_id}&rel_type=${rel_type}`),
  
  create: (data) => apiClient.post("/notes", data),
  
  update: (id, data) => apiClient.put(`/notes/${id}`, data),
  
  delete: (id) => apiClient.delete(`/notes/${id}`),
};

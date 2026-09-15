import { apiClient } from "../client";

export const noteService = {
  getAll: (rel_id, rel_type = "customer") =>
    apiClient.get(`/notes?rel_id=${rel_id}&rel_type=${rel_type}`),

  // Returns the subset of rel_ids that have at least one note — for a
  // lightweight "has notes" indicator on a list, without fetching every note.
  getRelIdsWithNotes: (rel_ids, rel_type) =>
    apiClient.get(`/notes/exists?rel_type=${rel_type}&rel_ids=${rel_ids.join(",")}`),

  create: (data) => apiClient.post("/notes", data),
  
  update: (id, data) => apiClient.put(`/notes/${id}`, data),
  
  delete: (id) => apiClient.delete(`/notes/${id}`),
};

import { apiClient } from "../client";

export const fileService = {
  getFiles: (relId, relType) => apiClient.get(`/files?rel_id=${relId}&rel_type=${relType}`),
  uploadFiles: (relId, relType, files) => {
    const formData = new FormData();
    formData.append("rel_id", relId);
    formData.append("rel_type", relType);
    files.forEach((file) => formData.append("files", file));
    return apiClient.post("/files", formData);
  },
  deleteFile: (fileId) => apiClient.delete(`/files/${fileId}`),
};

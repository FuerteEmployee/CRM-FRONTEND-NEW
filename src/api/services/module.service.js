import { apiClient } from "../client";

export const moduleService = {
  getModules: () => apiClient.get("/modules"),
  installModule: (file) => {
    const formData = new FormData();
    formData.append("module", file);
    return apiClient.post("/modules/install", formData);
  },
  toggleModule: (slug, active, core) => apiClient.patch("/modules/toggle", { slug, active, core }),
  deleteModule: (id) => apiClient.delete(`/modules/${id}`),
};

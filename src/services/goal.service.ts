import { apiClient } from "@/api/client";

export const goalService = {
  getGoals: () => apiClient.get("/goals"),
  createGoal: (data: any) => apiClient.post("/goals", data),
  updateGoal: (id: string, data: any) => apiClient.put(`/goals/${id}`, data),
  deleteGoal: (id: string) => apiClient.delete(`/goals/${id}`),
};

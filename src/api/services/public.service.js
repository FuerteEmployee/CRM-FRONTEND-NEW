import { apiClient } from "../client";

export const publicService = {
  // Active subscription plans for the landing page pricing cards.
  getPlans: async () => {
    const response = await apiClient.get("/public/plans");
    return Array.isArray(response) ? response : [];
  },

  // Self-service signup: creates a Tenant (Customer) + owner Staff account
  // on a 7-day trial. Throws on validation errors (duplicate email, etc.)
  // with a message from the backend.
  signup: async (data) => {
    return apiClient.post("/public/signup", data);
  },
};

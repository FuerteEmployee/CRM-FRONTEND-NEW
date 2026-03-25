
import { apiClient } from '../client';

export const authService = {
  login: async (data) => {
    const response = await apiClient.post('/auth/login', data);
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      if (response.permissions) {
        localStorage.setItem('permissions', JSON.stringify(response.permissions));
      }
    }
    return response;
  },

  verify2FA: async (data) => {
    const response = await apiClient.post('/auth/verify-2fa', data);
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    }
    return response;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getPermissions: () => {
    const perms = localStorage.getItem('permissions');
    return perms ? JSON.parse(perms) : null;
  }
};

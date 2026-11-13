import { apiRequest } from './apiClient';

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Log in user with credentials
   */
  login: async (username, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * Register a new account
   */
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Retrieve current user profile
   */
  getMe: async () => {
    return apiRequest('/auth/me');
  },

  /**
   * Retrieve list of system roles
   */
  getRoles: async () => {
    return apiRequest('/auth/roles');
  },
};

export default authService;


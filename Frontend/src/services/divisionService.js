import { apiRequest } from './apiClient';

/**
 * Division Service
 */
export const divisionService = {
  getAllNames: async () => {
    return apiRequest('/divisions?format=names');
  },
  getAll: async () => {
    return apiRequest('/divisions');
  },
};

export default divisionService;


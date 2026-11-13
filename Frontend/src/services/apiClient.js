/**
 * Centralized API Client for HTTP requests
 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  let userId = null;
  const storedUser = localStorage.getItem('itsm_user');
  if (storedUser) {
    try {
      userId = JSON.parse(storedUser)?.id;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export default {
  apiRequest,
  BASE_URL,
};


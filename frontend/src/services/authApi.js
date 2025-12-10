import axios from 'axios';
import config from '../config';

// Create axios instance for auth
const authAxios = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401 (unauthorized)
// FIXED: Return complete error object for proper error handling
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Return the complete error object so AuthContext can extract the error properly
    return Promise.reject(error);
  }
);

export const authApi = {
  // Check if admin setup is required
  checkSetup: async () => {
    const response = await authAxios.get('/api/auth/check-setup');
    return response.data;
  },

  // Setup first admin user
  setupAdmin: async (data) => {
    const response = await authAxios.post('/api/auth/setup-admin', data);
    return response.data;
  },

  // Login user (admin or sandbox)
  login: async (username, password) => {
    const response = await authAxios.post('/api/auth/login', {
      username,
      password
    });
    return response.data;
  },

  // Register sandbox user
  registerSandbox: async (data) => {
    const response = await authAxios.post('/api/auth/register-sandbox', data);
    return response.data;
  },

  // Logout
  logout: async (cleanup) => {
    // Extract session_id from JWT token
    const token = localStorage.getItem('token');
    let sessionId = null;
    
    if (token) {
      try {
        // Decode JWT (simple base64 decode of payload)
        const payload = JSON.parse(atob(token.split('.')[1]));
        sessionId = payload.session_id;
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }
    
    const response = await authAxios.post('/api/auth/logout', {
      cleanup,
      session_id: sessionId
    });
    return response.data;
  },

  // Extend session
  extendSession: async (hours) => {
    const response = await authAxios.post('/api/auth/extend-session', {
      hours
    });
    return response.data;
  },

  // Validate token
  validateToken: async () => {
    const response = await authAxios.get('/api/auth/validate');
    return response.data;
  },

  // Get session info
  getSessionInfo: async () => {
    const response = await authAxios.get('/api/auth/session-info');
    return response.data;
  },
};

export default authAxios;

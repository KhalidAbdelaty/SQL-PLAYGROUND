import axios from 'axios';
import config from '../config';

// Get or create session ID - now includes user ID for isolation
const getSessionId = () => {
  // Include the current user's ID in the session key to isolate history per user
  const token = localStorage.getItem('token');
  const userKey = token ? `_${token.substring(0, 16)}` : '';
  const sessionKey = `${config.SESSION_STORAGE_KEY}${userKey}`;
  
  let sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(sessionKey, sessionId);
  }
  return sessionId;
};

// Reset session ID (called on login/logout to get fresh history)
const resetSessionId = () => {
  // Remove all session keys to clear history across users
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(config.SESSION_STORAGE_KEY)) {
      localStorage.removeItem(key);
    }
  });
};

// Create axios instance
const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add session ID and JWT token to all requests
api.interceptors.request.use((config) => {
  const sessionId = getSessionId();
  config.headers['X-Session-Id'] = sessionId;
  
  // Add JWT token for authentication
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized - redirect to login
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      // Server responded with error
      console.error('API Error:', error.response.data);
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
      return Promise.reject({ error: 'Network error. Please check your connection.' });
    } else {
      // Something else happened
      console.error('Error:', error.message);
      return Promise.reject({ error: error.message });
    }
  }
);

// API methods
export const apiService = {
  // Query execution
  executeQuery: async (query, database = null, confirmDestructive = false) => {
    const response = await api.post('/api/execute', {
      query,
      database,
      confirm_destructive: confirmDestructive,
    });
    return response.data;
  },

  // Get databases
  getDatabases: async () => {
    const response = await api.get('/api/databases');
    return response.data;
  },

  // Get schema for a database
  getSchema: async (database) => {
    const response = await api.get(`/api/schema/${database}`);
    return response.data;
  },

  // Get table details
  getTableDetails: async (database, schema, table) => {
    const response = await api.post('/api/table-details', {
      database,
      schema,
      table,
    });
    return response.data;
  },

  // Get query history
  getHistory: async (limit = 50) => {
    const response = await api.get('/api/history', { params: { limit } });
    return response.data;
  },

  // Clear query history
  clearHistory: async () => {
    const response = await api.delete('/api/history');
    return response.data;
  },

  // Get session info
  getSession: async () => {
    const response = await api.get('/api/session');
    return response.data;
  },

  // Test connection
  testConnection: async () => {
    const response = await api.get('/api/connection-test');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Query formatting
  formatQuery: async (query, options = {}) => {
    const response = await api.post('/api/query/format', {
      query,
      keyword_case: options.keyword_case || 'upper',
      identifier_case: options.identifier_case || null,
      indent_width: options.indent_width || 4,
      strip_comments: options.strip_comments || false,
    });
    return response.data;
  },

  // Saved queries
  getSavedQueries: async (options = {}) => {
    const response = await api.get('/api/query/saved', {
      params: {
        favorites_only: options.favorites_only || false,
        search: options.search || '',
        limit: options.limit || 50,
      },
    });
    return response.data;
  },

  saveQuery: async (data) => {
    const response = await api.post('/api/query/saved', data);
    return response.data;
  },

  updateSavedQuery: async (queryId, data) => {
    const response = await api.put(`/api/query/saved/${queryId}`, data);
    return response.data;
  },

  deleteSavedQuery: async (queryId) => {
    const response = await api.delete(`/api/query/saved/${queryId}`);
    return response.data;
  },

  toggleQueryFavorite: async (queryId) => {
    const response = await api.post(`/api/query/saved/${queryId}/favorite`);
    return response.data;
  },

  // Cache stats
  getCacheStats: async () => {
    const response = await api.get('/api/cache/stats');
    return response.data;
  },
};

export { getSessionId, resetSessionId };
export default api;
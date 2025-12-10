import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authApi.validateToken();
          if (response.valid && response.user) {
            setUser(response.user);
            
            // Get session info for expiry
            try {
              const sessionInfo = await authApi.getSessionInfo();
              setSessionExpiry(sessionInfo.expires_at);
            } catch (err) {
              console.error('Failed to get session info:', err);
            }
          } else {
            throw new Error('Invalid token response');
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          setUser(null);
          setSessionExpiry(null);
        }
      }
      setLoading(false);
    };

    validateToken();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authApi.login(username, password);
      
      // Store token (correct property name from backend)
      localStorage.setItem('token', response.token);
      
      // Set user data from response.user object
      setUser(response.user);
      
      // Store expiry
      setSessionExpiry(response.expires_at);

      // Navigate to main app
      navigate('/', { replace: true });

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Extract meaningful error message
      const errorMessage = extractErrorMessage(error);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (username, password, email) => {
    try {
      const response = await authApi.registerSandbox({ username, email, password });
      
      // Store token (correct property name from backend)
      localStorage.setItem('token', response.token);
      
      // Set user data from response.user object
      setUser(response.user);
      
      // Store expiry
      setSessionExpiry(response.expires_at);

      // Navigate to main app
      navigate('/', { replace: true });

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Extract meaningful error message
      const errorMessage = extractErrorMessage(error);
      return { success: false, error: errorMessage };
    }
  };

  const extendSession = async (hours) => {
    try {
      const response = await authApi.extendSession(hours);
      setSessionExpiry(response.expires_at);
      return { success: true };
    } catch (error) {
      console.error('Extend session error:', error);
      return { success: false, error: error.detail || 'Failed to extend session' };
    }
  };

  const logout = async (cleanup = true) => {
    try {
      // Call backend logout API
      await authApi.logout(cleanup);
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local cleanup even if API fails
    }
    
    // Clear local state
    localStorage.removeItem('token');
    setUser(null);
    setSessionExpiry(null);
    navigate('/login', { replace: true });
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    extendSession,
    sessionExpiry,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSandbox: user?.role === 'sandbox'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Extract a user-friendly error message from various error formats
 */
function extractErrorMessage(error) {
  console.error('Full error object:', error);
  
  // Handle network errors with more context
  if (!error.response) {
    if (error.code === 'ECONNREFUSED') {
      return 'Backend server is not running. Please start the backend server at http://localhost:8000';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot reach the backend server. Check if it\'s running on http://localhost:8000';
    }
    if (error.message) {
      return `Connection error: ${error.message}. Make sure the backend server is running.`;
    }
    return 'Network error. Please check that the backend server is running at http://localhost:8000';
  }

  const { data, status } = error.response;

  // Handle different error response formats
  if (typeof data === 'string') {
    return data;
  }

  // Pydantic validation errors (422) - array of error objects
  if (status === 422 && Array.isArray(data.detail)) {
    const messages = data.detail.map(err => {
      const field = err.loc?.slice(-1)[0] || 'field';
      return `${field}: ${err.msg}`;
    });
    return messages.join(', ');
  }

  // Standard error detail
  if (data.detail) {
    return typeof data.detail === 'string' 
      ? data.detail 
      : JSON.stringify(data.detail);
  }

  // Server error with error field
  if (data.error) {
    return data.error;
  }

  // Fallback with status code
  return data.message || `Server error (HTTP ${status})`;
}
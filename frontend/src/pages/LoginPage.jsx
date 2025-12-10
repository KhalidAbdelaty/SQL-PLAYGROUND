import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear errors when user starts typing
    setError('');
    setSuccessMessage('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        setSuccessMessage('Login successful! Redirecting...');
        // Navigation happens in AuthContext
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Client-side validation
    if (!formData.username || !formData.password || !formData.email) {
      setError('All fields are required');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await register(
        formData.username,
        formData.password,
        formData.email
      );
      
      if (result.success) {
        setSuccessMessage('Registration successful! Redirecting...');
        // Navigation happens in AuthContext
      } else {
        // Ensure error is always a string
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError('');
    setSuccessMessage('');
    setFormData({ username: '', password: '', email: '' });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🗄️ SQL Playground</h1>
          <p>{isRegisterMode ? 'Create Sandbox Account' : 'Welcome Back'}</p>
        </div>

        <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
              disabled={loading}
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
            />
            {isRegisterMode && (
              <small className="form-hint">Minimum 8 characters</small>
            )}
          </div>

          {/* Safe error display - always renders a string */}
          {error && (
            <div className="error-message">
              <p>{String(error)}</p>
            </div>
          )}

          {/* Success message display */}
          {successMessage && (
            <div className="success-message">
              <p>{successMessage}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <span>
                {isRegisterMode ? 'Creating Account...' : 'Signing In...'}
              </span>
            ) : (
              <span>{isRegisterMode ? 'Create Sandbox Account' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button 
            onClick={toggleMode} 
            className="toggle-mode-button"
            disabled={loading}
          >
            {isRegisterMode 
              ? 'Already have an account? Sign In' 
              : 'Need a sandbox account? Register'}
          </button>
        </div>

        {!isRegisterMode && (
          <div className="admin-hint">
            <small>
              💡 <strong>Admin:</strong> Use your SQL Server credentials
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
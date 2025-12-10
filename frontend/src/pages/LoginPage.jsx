import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Database, User, Mail, Lock, ArrowRight, Sparkles, Server, Shield } from 'lucide-react';

// Static background orbs - CSS animation for better performance
const FloatingOrb = ({ size, color, position }) => (
  <div
    className={`absolute rounded-full blur-3xl opacity-20 ${size} ${color} animate-float`}
    style={{ ...position, willChange: 'transform' }}
  />
);

// Animated grid pattern
const GridPattern = () => (
  <div className="absolute inset-0 overflow-hidden opacity-20">
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  </div>
);

// Animated particles - reduced count for performance
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 bg-primary-400 rounded-full animate-float"
        style={{
          left: `${10 + i * 12}%`,
          top: `${20 + (i % 3) * 25}%`,
          animationDelay: `${i * 0.5}s`,
          opacity: 0.6,
        }}
      />
    ))}
  </div>
);

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
  const [focusedField, setFocusedField] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      } else {
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-space">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-mesh" />
      
      {/* Grid pattern overlay */}
      <GridPattern />
      
      {/* Floating orbs */}
      <FloatingOrb delay={0} size="w-96 h-96" color="bg-primary-500" position={{ top: '10%', left: '10%' }} />
      <FloatingOrb delay={2} size="w-80 h-80" color="bg-accent-500" position={{ top: '60%', right: '10%' }} />
      <FloatingOrb delay={4} size="w-64 h-64" color="bg-purple-500" position={{ bottom: '10%', left: '30%' }} />
      
      {/* Particles */}
      <Particles />

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-5xl mx-4 flex items-center gap-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left side - Branding */}
        <motion.div 
          className="hidden lg:flex flex-col flex-1 text-white"
          variants={itemVariants}
        >
          <motion.div 
            className="flex items-center gap-4 mb-8"
            variants={itemVariants}
          >
            <div className="p-4 bg-primary-500/20 backdrop-blur-sm rounded-2xl border border-primary-500/30">
              <Database className="w-12 h-12 text-primary-400" />
            </div>
            <div>
              <h1 className="text-4xl font-display font-bold text-gradient">
                SQL Playground
              </h1>
              <p className="text-slate-400 mt-1">Your safe space to experiment</p>
            </div>
          </motion.div>

          <motion.div className="space-y-6" variants={itemVariants}>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 backdrop-blur-sm border border-slate-700/50">
              <div className="p-2 bg-accent-500/20 rounded-lg">
                <Server className="w-6 h-6 text-accent-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Isolated Sandbox</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Get your own database to experiment without consequences
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 backdrop-blur-sm border border-slate-700/50">
              <div className="p-2 bg-primary-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Safe & Secure</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Dangerous query detection and confirmation dialogs
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/40 backdrop-blur-sm border border-slate-700/50">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Sparkles className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Professional Tools</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Monaco editor, AG Grid, real-time feedback
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right side - Login Form */}
        <motion.div 
          className="w-full max-w-md"
          variants={cardVariants}
        >
          <motion.div
            className="relative p-8 rounded-3xl bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 shadow-2xl"
            whileHover={{ 
              borderColor: 'rgba(99, 102, 241, 0.4)',
              boxShadow: '0 0 60px rgba(99, 102, 241, 0.15)',
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Gradient border glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/20 via-accent-500/10 to-primary-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />

            {/* Header */}
            <div className="text-center mb-8">
              <motion.div 
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 mb-4 shadow-glow"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Database className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-white">
                {isRegisterMode ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-slate-400 mt-2">
                {isRegisterMode 
                  ? 'Start your SQL journey today' 
                  : 'Sign in to continue to SQL Playground'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-5">
              {/* Username Field */}
              <motion.div 
                className="relative"
                whileFocus={{ scale: 1.02 }}
              >
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                  focusedField === 'username' ? 'text-primary-400' : 'text-slate-500'
                }`} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Username"
                  required
                  disabled={loading}
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 disabled:opacity-50"
                />
              </motion.div>

              {/* Email Field (Register only) */}
              <AnimatePresence>
                {isRegisterMode && (
                  <motion.div 
                    className="relative"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                      focusedField === 'email' ? 'text-primary-400' : 'text-slate-500'
                    }`} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Email address"
                      required
                      disabled={loading}
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 disabled:opacity-50"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password Field */}
              <motion.div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                  focusedField === 'password' ? 'text-primary-400' : 'text-slate-500'
                }`} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Password"
                  required
                  disabled={loading}
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 disabled:opacity-50"
                />
                {isRegisterMode && (
                  <p className="mt-2 text-xs text-slate-500">Minimum 8 characters</p>
                )}
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                  >
                    <p className="text-sm text-red-400">{String(error)}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success Message */}
              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                  >
                    <p className="text-sm text-green-400">{successMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                className="relative w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Button glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-accent-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <motion.div 
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      {isRegisterMode ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    <>
                      {isRegisterMode ? 'Create Sandbox Account' : 'Sign In'}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                disabled={loading}
                className="text-sm text-slate-400 hover:text-primary-400 transition-colors disabled:opacity-50"
              >
                {isRegisterMode 
                  ? 'Already have an account? Sign In' 
                  : 'Need a sandbox account? Register'}
              </button>
            </div>

            {/* Admin Hint */}
            {!isRegisterMode && (
              <motion.div 
                className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-xs text-slate-500 text-center">
                  💡 <strong className="text-slate-400">Admin:</strong> Use your SQL Server credentials
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div 
        className="absolute bottom-6 left-0 right-0 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-sm text-slate-600">
          Built with ❤️ by{' '}
          <a 
            href="https://www.linkedin.com/in/khalidabdelaty/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-400 transition-colors"
          >
            Khalid Abdelaty
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;

import React from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Database } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        {/* Background */}
        <div className="fixed inset-0 bg-mesh pointer-events-none" />
        
        <motion.div 
          className="relative z-10 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Animated Logo */}
          <motion.div 
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow"
            animate={{ 
              boxShadow: [
                '0 0 20px rgba(99, 102, 241, 0.3)',
                '0 0 40px rgba(99, 102, 241, 0.5)',
                '0 0 20px rgba(99, 102, 241, 0.3)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Database className="w-10 h-10 text-white" />
          </motion.div>

          {/* Loading spinner */}
          <motion.div 
            className="w-8 h-8 mx-auto mb-4 border-2 border-primary-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />

          <motion.p 
            className="text-slate-400 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading SQL Playground...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

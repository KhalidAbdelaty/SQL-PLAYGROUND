import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, Play, Ban } from 'lucide-react';

const ConfirmDialog = ({ operation, affectedObjects, onConfirm, onCancel }) => {
  const getOperationColor = () => {
    switch (operation?.toUpperCase()) {
      case 'DROP':
      case 'TRUNCATE':
        return 'red';
      case 'DELETE':
      case 'UPDATE':
        return 'amber';
      default:
        return 'amber';
    }
  };

  const color = getOperationColor();
  
  const colorClasses = {
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-400',
      button: 'from-red-500 to-red-600',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      button: 'from-amber-500 to-amber-600',
    },
  };

  const classes = colorClasses[color];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="relative w-full max-w-lg mx-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Header */}
        <div className={`p-6 ${classes.bg} border-b ${classes.border}`}>
          <div className="flex items-start gap-4">
            <motion.div 
              className={`p-3 rounded-xl ${classes.bg} border ${classes.border}`}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <AlertTriangle className={`w-6 h-6 ${classes.icon}`} />
            </motion.div>
            <div className="flex-1">
              <h3 className="text-xl font-display font-bold text-white">
                Confirm {operation?.toUpperCase()}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                This is a destructive operation that cannot be undone.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-slate-300 mb-3">
              You are about to execute a <strong className={classes.icon}>{operation}</strong> operation.
            </p>
            
            {affectedObjects && affectedObjects.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-slate-400 mb-2">Affected objects:</p>
                <div className="flex flex-wrap gap-2">
                  {affectedObjects.map((obj, index) => (
                    <motion.span
                      key={index}
                      className="px-3 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white font-mono"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {obj}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Warning Box */}
          <div className={`p-4 ${classes.bg} border ${classes.border} rounded-xl mb-6`}>
            <p className="text-sm text-slate-300">
              <strong className={classes.icon}>⚠️ Warning:</strong> This action may result in permanent data loss. 
              Please ensure you have backups if needed.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              onClick={onConfirm}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${classes.button} text-white font-medium rounded-xl transition-all`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Play className="w-4 h-4" />
              Yes, Execute
            </motion.button>
            <motion.button
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 glass text-slate-300 rounded-xl transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Ban className="w-4 h-4" />
              Cancel
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmDialog;

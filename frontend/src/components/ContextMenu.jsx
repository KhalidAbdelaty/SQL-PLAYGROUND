import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Hash, Database, Eye, List, Copy, Play } from 'lucide-react';
import { showToast } from './Toast';

const ContextMenu = ({ x, y, database, schema, table, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const fullTableName = `[${database}].[${schema}].[${table}]`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast.copied('Copied to clipboard');
    onClose();
  };

  const menuItems = [
    {
      label: 'SELECT TOP 100 *',
      icon: <Eye className="w-4 h-4" />,
      action: () => copyToClipboard(`SELECT TOP 100 * FROM ${fullTableName}`),
    },
    {
      label: 'SELECT COUNT(*)',
      icon: <Hash className="w-4 h-4" />,
      action: () => copyToClipboard(`SELECT COUNT(*) FROM ${fullTableName}`),
    },
    {
      label: 'Copy Table Name',
      icon: <Copy className="w-4 h-4" />,
      action: () => copyToClipboard(fullTableName),
    },
    {
      label: 'Describe Table',
      icon: <List className="w-4 h-4" />,
      action: () => copyToClipboard(`EXEC sp_help '${schema}.${table}'`),
    },
  ];

  // Adjust position to keep menu in viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  return (
    <motion.div
      ref={menuRef}
      className="fixed z-50"
      style={{ top: adjustedY, left: adjustedX }}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.15 }}
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-700/50 bg-slate-800/50">
          <p className="text-xs text-slate-500 truncate">{schema}.{table}</p>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          {menuItems.map((item, index) => (
            <motion.button
              key={index}
              onClick={item.action}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-primary-500/20 flex items-center gap-3 text-slate-300 hover:text-white transition-colors group"
              whileHover={{ x: 4 }}
            >
              <span className="text-slate-500 group-hover:text-primary-400 transition-colors">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ContextMenu;

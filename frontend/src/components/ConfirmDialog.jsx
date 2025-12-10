import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning' // 'warning' | 'danger' | 'info'
}) => {
  if (!isOpen) return null;

  const colors = {
    warning: {
      bg: 'bg-yellow-900/20',
      border: 'border-yellow-500',
      icon: 'text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      bg: 'bg-red-900/20',
      border: 'border-red-500',
      icon: 'text-red-400',
      button: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-500',
      icon: 'text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const colorSet = colors[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`w-5 h-5 ${colorSet.icon}`} />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className={`p-4 ${colorSet.bg} border-l-4 ${colorSet.border} m-4 rounded`}>
          <p className="text-gray-200">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${colorSet.button} text-white rounded transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
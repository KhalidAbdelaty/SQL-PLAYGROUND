import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Custom toast styles that match the Aurora theme
const toastStyles = {
  style: {
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    color: '#F8FAFC',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.1)',
  },
};

// Toast provider component
export const ToastProvider = () => (
  <Toaster
    position="top-right"
    gutter={12}
    containerStyle={{
      top: 80,
      right: 20,
    }}
    toastOptions={{
      ...toastStyles,
      duration: 4000,
      success: {
        ...toastStyles,
        iconTheme: {
          primary: '#22D3EE',
          secondary: '#0F0F23',
        },
      },
      error: {
        ...toastStyles,
        iconTheme: {
          primary: '#EF4444',
          secondary: '#0F0F23',
        },
        duration: 5000,
      },
    }}
  />
);

// Custom toast functions with icons
export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, {
      icon: <CheckCircle className="w-5 h-5 text-cyan-400" />,
      ...options,
    });
  },
  
  error: (message, options = {}) => {
    toast.error(message, {
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      ...options,
    });
  },
  
  warning: (message, options = {}) => {
    toast(message, {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      style: {
        ...toastStyles.style,
        border: '1px solid rgba(251, 191, 36, 0.3)',
      },
      ...options,
    });
  },
  
  info: (message, options = {}) => {
    toast(message, {
      icon: <Info className="w-5 h-5 text-indigo-400" />,
      ...options,
    });
  },
  
  loading: (message, options = {}) => {
    return toast.loading(message, {
      style: toastStyles.style,
      ...options,
    });
  },
  
  dismiss: (toastId) => {
    toast.dismiss(toastId);
  },
  
  promise: (promise, messages, options = {}) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Error occurred',
      },
      {
        style: toastStyles.style,
        ...options,
      }
    );
  },
  
  // Custom toast with action button
  action: (message, actionText, onAction, options = {}) => {
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span>{message}</span>
          <button
            onClick={() => {
              onAction();
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors"
          >
            {actionText}
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      {
        duration: 10000,
        style: toastStyles.style,
        ...options,
      }
    );
  },
  
  // Query result toast
  queryResult: (success, rowCount, executionTime, fromCache = false) => {
    if (success) {
      toast.success(
        <div className="flex flex-col">
          <span className="font-medium">Query executed successfully</span>
          <span className="text-sm text-slate-400">
            {rowCount} row{rowCount !== 1 ? 's' : ''} • {executionTime}s
            {fromCache && ' • from cache'}
          </span>
        </div>,
        {
          icon: <CheckCircle className="w-5 h-5 text-cyan-400" />,
          duration: 3000,
        }
      );
    }
  },
  
  // Copy confirmation toast
  copied: (what = 'Copied to clipboard') => {
    toast.success(what, {
      icon: '📋',
      duration: 2000,
    });
  },
};

export default ToastProvider;


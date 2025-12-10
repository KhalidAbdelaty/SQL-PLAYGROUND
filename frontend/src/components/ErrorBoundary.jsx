import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-space flex items-center justify-center p-4">
          {/* Background */}
          <div className="fixed inset-0 bg-mesh pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl w-full">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-8 bg-red-500/10 border-b border-red-500/30">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-red-500/20 rounded-2xl">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-display font-bold text-white">
                      Oops! Something went wrong
                    </h1>
                    <p className="text-slate-400 mt-2">
                      The application encountered an unexpected error. Don't worry, your work is safe.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Error Details */}
                {this.state.error && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Error Details
                    </h2>
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 overflow-auto max-h-40">
                      <pre className="text-sm text-red-400 font-mono">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Stack Trace (Development Only) */}
                {this.state.errorInfo && import.meta.env.DEV && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Stack Trace
                    </h2>
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 overflow-auto max-h-48">
                      <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold transition-all hover:shadow-glow"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Reload Application
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/'}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-xl transition-all hover:border-slate-600"
                  >
                    <Home className="w-5 h-5" />
                    Home
                  </button>
                </div>

                {/* Help Text */}
                <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <p className="text-sm text-slate-300 font-medium mb-2">
                    Troubleshooting tips:
                  </p>
                  <ul className="text-sm text-slate-500 space-y-1">
                    <li>• Click "Reload Application" to restart</li>
                    <li>• Check if the backend server is running</li>
                    <li>• Open browser console (F12) for details</li>
                    <li>• Verify your database connection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

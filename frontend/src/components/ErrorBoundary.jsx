import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
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
    
    // Reload the page to start fresh
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl p-8">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
              <AlertTriangle className="w-12 h-12 text-red-500" />
              <div>
                <h1 className="text-2xl font-bold text-red-500">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  The application encountered an unexpected error
                </p>
              </div>
            </div>

            {/* Error Details */}
            {this.state.error && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2 text-gray-200">
                  Error Details:
                </h2>
                <div className="bg-gray-900 p-4 rounded border border-gray-700 overflow-auto max-h-40">
                  <pre className="text-sm text-red-400 font-mono">
                    {this.state.error.toString()}
                  </pre>
                </div>
              </div>
            )}

            {/* Stack Trace (Development Only) */}
            {this.state.errorInfo && import.meta.env.DEV && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2 text-gray-200">
                  Stack Trace:
                </h2>
                <div className="bg-gray-900 p-4 rounded border border-gray-700 overflow-auto max-h-60">
                  <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors font-semibold"
              >
                Reload Application
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Go to Home
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-gray-900 rounded border border-gray-700">
              <p className="text-sm text-gray-400">
                <strong className="text-gray-300">What you can do:</strong>
              </p>
              <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
                <li>Click "Reload Application" to restart</li>
                <li>Check the browser console for more details (F12)</li>
                <li>Check if the backend server is running</li>
                <li>Verify your database connection settings</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


import React, { useState, useEffect } from 'react';
import { History, Clock, CheckCircle, XCircle, Trash2, Copy } from 'lucide-react';
import { apiService } from '../services/api';

const QueryHistory = ({ onQuerySelect }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    // Set up auto-refresh every 2 seconds
    const interval = setInterval(loadHistory, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async () => {
    try {
      const response = await apiService.getHistory();
      setHistory(response.history || []);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all query history?')) {
      try {
        await apiService.clearHistory();
        setHistory([]);
      } catch (err) {
        console.error('Error clearing history:', err);
      }
    }
  };

  const handleCopyQuery = (query) => {
    navigator.clipboard.writeText(query);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="h-full bg-gray-800 text-gray-200 flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Query History</h3>
          <span className="text-xs text-gray-400">({history.length})</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-red-400"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="text-center text-gray-400 py-4">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No query history yet</p>
          </div>
        ) : (
          history.slice().reverse().map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded p-3 hover:bg-gray-750 transition-colors group"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {item.success ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatTime(item.timestamp)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.execution_time}s
                  </span>
                  {item.success && (
                    <span className="text-xs text-gray-500">
                      {item.row_count} rows
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleCopyQuery(item.query)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
                  title="Copy query"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              {/* Query */}
              <div
                className="text-sm font-mono bg-gray-900 p-2 rounded cursor-pointer hover:bg-gray-850"
                onClick={() => onQuerySelect(item.query)}
              >
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {item.query.length > 200
                    ? item.query.substring(0, 200) + '...'
                    : item.query}
                </pre>
              </div>

              {/* Error */}
              {!item.success && item.error && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                  {item.error.substring(0, 100)}
                  {item.error.length > 100 && '...'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QueryHistory;
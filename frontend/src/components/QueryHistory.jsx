import React, { useState, useEffect, memo } from 'react';
import { History, Clock, CheckCircle, XCircle, Trash2, Copy } from 'lucide-react';
import { apiService } from '../services/api';
import { showToast } from './Toast';

const QueryHistory = memo(({ onSelectQuery }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 3000); // Reduced frequency
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
    try {
      await apiService.clearHistory();
      setHistory([]);
      showToast.success('Query history cleared');
    } catch (err) {
      console.error('Error clearing history:', err);
      showToast.error('Failed to clear history');
    }
  };

  const handleCopyQuery = (e, query) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query);
    showToast.copied('Query copied to clipboard');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-slate-700/50 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary-400" />
          <h3 className="font-semibold text-sm text-white">History</h3>
          <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => showToast.action('Clear all history?', 'Clear', handleClearHistory)}
            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-slate-500 hover:text-red-400"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 animate-fade-in">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-700" />
            <p className="text-sm text-slate-500">No history yet</p>
            <p className="text-xs text-slate-600 mt-1">Execute queries to see them here</p>
          </div>
        ) : (
          history.slice().reverse().map((item) => (
            <div
              key={item.id}
              className="p-3 glass rounded-xl hover:border-primary-500/30 transition-all group cursor-pointer"
              onClick={() => onSelectQuery(item.query)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {item.success ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(item.timestamp)}
                  </span>
                  <span className="text-xs text-slate-600">
                    {item.execution_time}s
                  </span>
                  {item.success && item.row_count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                      {item.row_count} rows
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleCopyQuery(e, item.query)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-700 rounded-lg transition-all"
                  title="Copy query"
                >
                  <Copy className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Query Preview */}
              <div className="font-mono text-xs bg-slate-900/50 p-2 rounded-lg text-slate-400 overflow-hidden">
                <pre className="whitespace-pre-wrap break-words line-clamp-2">
                  {item.query.length > 150
                    ? item.query.substring(0, 150) + '...'
                    : item.query}
                </pre>
              </div>

              {/* Error */}
              {!item.success && item.error && (
                <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                  {item.error.substring(0, 80)}
                  {item.error.length > 80 && '...'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

QueryHistory.displayName = 'QueryHistory';

export default QueryHistory;

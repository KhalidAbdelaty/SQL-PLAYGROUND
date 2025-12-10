import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AgGridReact } from 'ag-grid-react';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  FileDown,
  Clock,
  Table2,
  Zap,
  Copy
} from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import config from '../config';
import { showToast } from './Toast';

const ResultsGrid = ({ result, onExport }) => {
  // Generate column definitions from data
  const columnDefs = useMemo(() => {
    if (!result || !result.columns) return [];
    
    return result.columns.map(col => ({
      field: col,
      headerName: col,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
    }));
  }, [result?.columns]);

  // Default column properties
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: true,
    resizable: true,
  }), []);

  const handleExport = (format) => {
    if (onExport) {
      onExport(format);
    }
  };

  const handleCopyResults = () => {
    if (result?.data && result.data.length > 0) {
      const text = JSON.stringify(result.data, null, 2);
      navigator.clipboard.writeText(text);
      showToast.copied('Results copied to clipboard');
    }
  };

  // Empty state
  if (!result) {
    return (
      <div className="flex items-center justify-center h-full glass-dark">
        <motion.div 
          className="text-center p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center"
            animate={{ 
              boxShadow: ['0 0 0 rgba(99, 102, 241, 0)', '0 0 30px rgba(99, 102, 241, 0.2)', '0 0 0 rgba(99, 102, 241, 0)']
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Table2 className="w-10 h-10 text-slate-600" />
          </motion.div>
          <p className="text-lg text-slate-400 font-medium">No query executed yet</p>
          <p className="text-sm text-slate-500 mt-2">
            Write a SQL query and press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">Ctrl+Enter</kbd> to see results
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full glass-dark">
      {/* Result Header */}
      <motion.div 
        className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-700/50 overflow-x-auto no-scrollbar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Status Badge */}
          <AnimatePresence mode="wait">
            {result.success ? (
              <motion.div 
                key="success"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg shrink-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                <span className="text-xs sm:text-sm font-medium text-green-400">Success</span>
              </motion.div>
            ) : (
              <motion.div 
                key="error"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg shrink-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                <span className="text-xs sm:text-sm font-medium text-red-400">Error</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result Stats */}
          {result.success && (
            <motion.div 
              className="flex items-center gap-2 sm:gap-4 shrink-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400">
                <Table2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-400" />
                <span className="font-medium text-white">{result.row_count || 0}</span>
                <span className="hidden sm:inline">rows</span>
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent-400" />
                <span className="font-medium text-white">{result.execution_time}s</span>
              </div>

              {result.from_cache && (
                <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-accent-500/10 border border-accent-500/30 rounded-lg text-[10px] sm:text-xs text-accent-400">
                  <Zap className="w-3 h-3" />
                  <span className="hidden sm:inline">cached</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Warning */}
          {result.requires_confirmation && (
            <div className="flex items-center gap-2 text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{result.warning}</span>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        {result.success && result.data && result.data.length > 0 && (
          <motion.div 
            className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-4"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-xs text-slate-500 hidden lg:block">Export:</span>
            
            <motion.button
              onClick={handleCopyResults}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 glass rounded-lg text-slate-400 hover:text-white hover:border-primary-500/50 transition-all text-xs sm:text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Copy JSON"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </motion.button>

            <motion.button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 glass rounded-lg text-slate-400 hover:text-white hover:border-green-500/50 transition-all text-xs sm:text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Export CSV"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </motion.button>
            
            <motion.button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 glass rounded-lg text-slate-400 hover:text-white hover:border-amber-500/50 transition-all text-xs sm:text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              title="Export JSON"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      {/* Result Content */}
      <div className="flex-1 relative">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
        
        {result.success ? (
          result.data && result.data.length > 0 ? (
            // Data Grid
            <motion.div 
              className="ag-theme-alpine-dark h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AgGridReact
                rowData={result.data}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={config.DEFAULT_PAGE_SIZE}
                paginationPageSizeSelector={[10, 25, 50, 100]}
                suppressMovableColumns={false}
                enableCellTextSelection={true}
                ensureDomOrder={true}
                animateRows={true}
                rowSelection="multiple"
              />
            </motion.div>
          ) : (
            // No data message
            <motion.div 
              className="flex items-center justify-center h-full"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                >
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                </motion.div>
                <p className="text-lg text-white font-medium">{result.message || 'Query executed successfully'}</p>
                {result.row_count > 0 && (
                  <p className="text-sm text-slate-400 mt-1">{result.row_count} row(s) affected</p>
                )}
              </div>
            </motion.div>
          )
        ) : (
          // Error message
          <motion.div 
            className="flex items-center justify-center h-full p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center max-w-2xl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              </motion.div>
              <p className="text-lg font-semibold text-red-400 mb-4">Query Error</p>
              <pre className="text-sm text-left bg-slate-900/80 border border-red-500/20 p-4 rounded-xl overflow-auto max-h-64 text-red-300 font-mono">
                {result.error}
              </pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ResultsGrid;

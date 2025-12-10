import React, { useState, useEffect, memo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Split from 'react-split';
import { useMediaQuery } from 'react-responsive';
import SQLEditor from './components/Editor';
import ResultsGrid from './components/ResultsGrid';
import SchemaTree from './components/SchemaTree';
import QueryHistory from './components/QueryHistory';
import ConfirmDialog from './components/ConfirmDialog';
import SessionHeader from './components/SessionHeader';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import SavedQueries from './components/SavedQueries';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { ToastProvider, showToast } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { apiService } from './services/api';
import { exportToCSV, exportToJSON } from './utils/helpers';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { 
  Database, 
  Sparkles, 
  Folder,
  Keyboard,
  Code2,
  Menu,
  X,
  Table2,
  Terminal
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Main SQL Playground Component (protected)
const SQLPlayground = memo(() => {
  const { user, isAdmin, isSandbox } = useAuth();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  
  const [query, setQuery] = useState('-- Write your SQL query here\nSELECT @@VERSION AS [SQL Server Version]');
  const [result, setResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentDatabase, setCurrentDatabase] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false });
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [showSavedQueries, setShowSavedQueries] = useState(false);
  const [openSaveFormOnMount, setOpenSaveFormOnMount] = useState(false);
  
  // Mobile states
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('editor'); // 'editor' or 'results'

  // Keyboard shortcuts
  const { showShortcutsPanel, setShowShortcutsPanel } = useKeyboardShortcuts({
    FORMAT_QUERY: () => handleFormatQuery(),
    SAVE_QUERY: () => {
      setOpenSaveFormOnMount(true);
      setShowSavedQueries(true);
    },
    TOGGLE_SAVED_QUERIES: () => {
      setOpenSaveFormOnMount(false);
      setShowSavedQueries(true);
    },
    NEW_QUERY: () => setQuery('-- New query\n'),
    ESCAPE: () => {
      setShowSavedQueries(false);
      setShowConfirm(false);
      setShowMobileSidebar(false);
    },
  });

  useEffect(() => {
    checkConnection();
    
    if (isSandbox && user?.database_name) {
      setCurrentDatabase(user.database_name);
    }
  }, [user, isSandbox]);

  const checkConnection = async () => {
    try {
      const status = await apiService.testConnection();
      setConnectionStatus(status);
      
      if (isAdmin && status.database && !currentDatabase) {
        setCurrentDatabase(status.database);
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionStatus({ connected: false, error: err.error });
    }
  };

  const handleFormatQuery = async () => {
    try {
      const result = await apiService.formatQuery(query);
      if (result.success && result.formatted) {
        setQuery(result.formatted);
        showToast.success('Query formatted');
      }
    } catch (err) {
      showToast.error('Failed to format query');
    }
  };

  const handleExecuteQuery = async (confirmDestructive = false, queryToExecute = null) => {
    const queryText = queryToExecute !== null ? queryToExecute : query;
    
    if (typeof queryText !== 'string' || !queryText.trim()) {
      setResult({
        success: false,
        error: 'Please enter a query to execute'
      });
      return;
    }

    setIsExecuting(true);

    try {
      const result = await apiService.executeQuery(
        queryText,
        currentDatabase,
        confirmDestructive
      );

      if (result.requires_confirmation && !confirmDestructive) {
        setConfirmData({
          query: result.query,
          operation: result.operation,
          affected: result.affected_objects,
        });
        setShowConfirm(true);
        setIsExecuting(false);
        return;
      }

      setResult(result);
      setHistoryKey(prev => prev + 1);
      setShowConfirm(false);
      setConfirmData(null);

      if (result.success) {
        showToast.queryResult(true, result.row_count || 0, result.execution_time, result.from_cache);
      }
    } catch (err) {
      setResult({
        success: false,
        error: err.error || 'Query execution failed'
      });
      showToast.error(err.error || 'Query execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleConfirmExecution = () => {
    setShowConfirm(false);
    handleExecuteQuery(true);
  };

  const handleCancelExecution = () => {
    setShowConfirm(false);
    setConfirmData(null);
    setIsExecuting(false);
  };

  const handleExport = (format) => {
    if (!result?.data || result.data.length === 0) {
      showToast.warning('No data to export');
      return;
    }

    const filename = `query_result_${new Date().toISOString().slice(0, 10)}`;

    try {
      if (format === 'csv') {
        exportToCSV(result.data, result.columns, filename);
        showToast.success(`Exported ${result.data.length} rows to CSV`);
      } else if (format === 'json') {
        exportToJSON(result.data, filename);
        showToast.success(`Exported ${result.data.length} rows to JSON`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      showToast.error('Export failed: ' + err.message);
    }
  };

  const handleSelectQuery = (historyQuery) => {
    setQuery(historyQuery);
  };

  const handleDatabaseChange = (database) => {
    setCurrentDatabase(database);
  };

  return (
    <div className="h-screen flex flex-col bg-space overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-mesh pointer-events-none" />
      
      {/* Session Header */}
      <SessionHeader />

      {/* Main Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 glass-dark border-b border-slate-700/50 animate-fade-in">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-glow">
            <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-display font-bold text-gradient leading-tight">
              SQL Playground
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">
              {isAdmin ? 'Administrator Access' : 'Sandbox Environment'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Action Buttons */}
          <button
            onClick={() => setShowSavedQueries(true)}
            className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 glass rounded-xl text-slate-300 hover:text-white hover:border-primary-500/50 transition-all"
            title="Saved Queries"
          >
            <Folder className="w-4 h-4" />
            <span className="hidden sm:inline">Saved</span>
          </button>

          <button
            onClick={handleFormatQuery}
            className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 glass rounded-xl text-slate-300 hover:text-white hover:border-primary-500/50 transition-all"
            title="Format Query"
          >
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">Format</span>
          </button>

          <button
            onClick={() => setShowShortcutsPanel(true)}
            className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 glass rounded-xl text-slate-300 hover:text-white hover:border-primary-500/50 transition-all"
            title="Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border ${
            connectionStatus.connected 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus.connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <span className={`text-xs sm:text-sm font-medium hidden sm:inline ${
              connectionStatus.connected ? 'text-green-400' : 'text-red-400'
            }`}>
              {connectionStatus.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative z-10">
        {isMobile ? (
          // Mobile Layout
          <div className="flex flex-col h-full">
            {/* Mobile Tabs */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-700/50 bg-slate-900/50">
              <button
                onClick={() => setActiveMobileTab('editor')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeMobileTab === 'editor'
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveMobileTab('results')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeMobileTab === 'results'
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                Results
                {result && (
                  <span className={`ml-2 text-xs ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                    ●
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-hidden relative">
              {/* Editor Tab */}
              <div className={`absolute inset-0 flex flex-col ${activeMobileTab === 'editor' ? 'z-10' : 'z-0 invisible'}`}>
                <SQLEditor
                  value={query}
                  onChange={setQuery}
                  onExecute={handleExecuteQuery}
                  isExecuting={isExecuting}
                  currentDatabase={currentDatabase}
                  onFormat={handleFormatQuery}
                />
              </div>

              {/* Results Tab */}
              <div className={`absolute inset-0 flex flex-col ${activeMobileTab === 'results' ? 'z-10' : 'z-0 invisible'}`}>
                <ResultsGrid
                  result={result}
                  onExport={handleExport}
                />
              </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
              {showMobileSidebar && (
                <div className="fixed inset-0 z-50 flex">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowMobileSidebar(false)}
                  />
                  
                  {/* Sidebar Panel */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-[85%] max-w-xs h-full bg-slate-900 border-r border-slate-700/50 flex flex-col shadow-2xl"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                      <h3 className="font-display font-bold text-white">Database Explorer</h3>
                      <button
                        onClick={() => setShowMobileSidebar(false)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="flex-1 overflow-auto p-2">
                        <SchemaTree 
                          currentDatabase={currentDatabase}
                          onDatabaseChange={handleDatabaseChange}
                          onTableSelect={(table) => {
                            setQuery(`SELECT TOP 100 * FROM ${table.schema}.${table.name}`);
                            setShowMobileSidebar(false);
                            setActiveMobileTab('editor');
                          }}
                        />
                      </div>
                      
                      <div className="border-t border-slate-700/50 h-1/3 min-h-[200px] flex flex-col">
                        <div className="p-3 border-b border-slate-700/50 bg-slate-800/30">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Recent History
                          </h4>
                        </div>
                        <QueryHistory 
                          key={historyKey}
                          onSelectQuery={(q) => {
                            handleSelectQuery(q);
                            setShowMobileSidebar(false);
                            setActiveMobileTab('editor');
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          // Desktop Layout
          <Split
            className="flex h-full"
            sizes={[20, 80]}
            minSize={[200, 500]}
            gutterSize={6}
            gutterStyle={() => ({
              background: 'linear-gradient(180deg, transparent 30%, rgba(99, 102, 241, 0.3) 50%, transparent 70%)',
              cursor: 'col-resize',
            })}
          >
            {/* Left Sidebar */}
            <div className="glass-dark border-r border-slate-700/50 overflow-hidden flex flex-col h-full">
              <div className="flex-1 min-h-0 overflow-auto">
                <SchemaTree 
                  currentDatabase={currentDatabase}
                  onDatabaseChange={handleDatabaseChange}
                  onTableSelect={(table) => {
                    setQuery(`SELECT TOP 100 * FROM ${table.schema}.${table.name}`);
                  }}
                />
              </div>
              
              <div className="border-t border-slate-700/50 h-80 min-h-0 flex flex-col">
                <QueryHistory 
                  key={historyKey}
                  onSelectQuery={handleSelectQuery}
                />
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex flex-col">
              <Split
                direction="vertical"
                sizes={[50, 50]}
                minSize={[200, 200]}
                gutterSize={6}
                gutterStyle={() => ({
                  background: 'linear-gradient(90deg, transparent 30%, rgba(99, 102, 241, 0.3) 50%, transparent 70%)',
                  cursor: 'row-resize',
                })}
                className="flex flex-col h-full"
              >
                {/* SQL Editor */}
                <div className="overflow-hidden flex flex-col h-full min-h-0">
                  <SQLEditor
                    value={query}
                    onChange={setQuery}
                    onExecute={handleExecuteQuery}
                    isExecuting={isExecuting}
                    currentDatabase={currentDatabase}
                    onFormat={handleFormatQuery}
                  />
                </div>

                {/* Results Grid */}
                <div className="overflow-hidden flex flex-col h-full min-h-0">
                  <ResultsGrid
                    result={result}
                    onExport={handleExport}
                  />
                </div>
              </Split>
            </div>
          </Split>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 glass-dark border-t border-slate-700/50 px-6 py-3">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-4">
            <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">Ctrl+Shift+H</kbd> for shortcuts</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary-500" />
            <span>© 2025 Khalid Abdelaty</span>
            <span className="text-slate-600">|</span>
            <a 
              href="https://www.linkedin.com/in/khalidabdelaty/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showConfirm && confirmData && (
        <ConfirmDialog
          operation={confirmData.operation}
          affectedObjects={confirmData.affected}
          onConfirm={handleConfirmExecution}
          onCancel={handleCancelExecution}
        />
      )}

      {showSavedQueries && (
        <SavedQueries
          onSelectQuery={(q) => {
            setQuery(q);
            showToast.success('Query loaded');
          }}
          onClose={() => {
            setShowSavedQueries(false);
            setOpenSaveFormOnMount(false);
          }}
          currentQuery={query}
          initialShowSaveForm={openSaveFormOnMount}
        />
      )}

      <KeyboardShortcuts 
        isOpen={showShortcutsPanel} 
        onClose={() => setShowShortcutsPanel(false)} 
      />
    </div>
  );
});

SQLPlayground.displayName = 'SQLPlayground';

// Main App with Routing
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SQLPlayground />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

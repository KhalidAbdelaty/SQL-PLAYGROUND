import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Split from 'react-split';
import SQLEditor from './components/Editor';
import ResultsGrid from './components/ResultsGrid';
import SchemaTree from './components/SchemaTree';
import QueryHistory from './components/QueryHistory';
import ConfirmDialog from './components/ConfirmDialog';
import SessionHeader from './components/SessionHeader';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { apiService } from './services/api';
import { exportToCSV, exportToJSON } from './utils/helpers';
import { Database, Activity, Settings, Github } from 'lucide-react';

// Main SQL Playground Component (protected)
function SQLPlayground() {
  const { user, isAdmin, isSandbox } = useAuth();
  
  const [query, setQuery] = useState('-- Write your SQL query here\nSELECT @@VERSION AS [SQL Server Version]');
  const [result, setResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentDatabase, setCurrentDatabase] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false });
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    checkConnection();
    
    // Set default database for sandbox users
    if (isSandbox && user?.database_name) {
      setCurrentDatabase(user.database_name);
    }
  }, [user, isSandbox]);

  const checkConnection = async () => {
    try {
      const status = await apiService.testConnection();
      setConnectionStatus(status);
      
      // For admin users, set database from connection status
      if (isAdmin && status.database && !currentDatabase) {
        setCurrentDatabase(status.database);
      }
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionStatus({ connected: false, error: err.error });
    }
  };

  const handleExecuteQuery = async (confirmDestructive = false, queryToExecute = null) => {
    // Use provided query or fall back to state query
    const queryText = queryToExecute !== null ? queryToExecute : query;
    
    // Ensure queryText is a string
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
    } catch (err) {
      setResult({
        success: false,
        error: err.error || 'Query execution failed'
      });
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
      alert('No data to export');
      return;
    }

    const filename = `query_result_${new Date().toISOString().slice(0, 10)}`;

    try {
      if (format === 'csv') {
        exportToCSV(result.data, result.columns, filename);
      } else if (format === 'json') {
        exportToJSON(result.data, filename);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    }
  };

  const handleSelectQuery = (historyQuery) => {
    setQuery(historyQuery);
  };

  const handleDatabaseChange = (database) => {
    setCurrentDatabase(database);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Session Header */}
      <SessionHeader />

      {/* Main Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">SQL Playground</h1>
            <p className="text-sm text-gray-400">
              {isAdmin ? 'Administrator Access' : 'Sandbox Environment'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {connectionStatus.connected ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-700 rounded">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-300">Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-700 rounded">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-sm text-red-300">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Split
          className="flex h-full"
          sizes={[20, 80]}
          minSize={[200, 500]}
          gutterSize={8}
          gutterStyle={() => ({
            backgroundColor: '#374151',
            cursor: 'col-resize',
          })}
        >
          {/* Left Sidebar */}
          <div className="bg-gray-800 overflow-hidden flex flex-col h-full">
            <div className="flex-1 min-h-0 overflow-auto">
              <SchemaTree 
                currentDatabase={currentDatabase}
                onDatabaseChange={handleDatabaseChange}
                onTableSelect={(table) => {
                  setQuery(`SELECT * FROM ${table.schema}.${table.name}`);
                }}
              />
            </div>
            
            <div className="border-t border-gray-700 h-80 min-h-0 flex flex-col">
              <QueryHistory 
                key={historyKey}
                onSelectQuery={handleSelectQuery}
              />
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex flex-col bg-gray-900">
            <Split
              direction="vertical"
              sizes={[50, 50]}
              minSize={[200, 200]}
              gutterSize={8}
              gutterStyle={() => ({
                backgroundColor: '#374151',
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
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-3">
        <div className="flex items-center justify-center text-sm text-gray-400">
          <span>© 2025 Khalid Abdelaty | </span>
          <a 
            href="https://www.linkedin.com/in/khalidabdelaty/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-1 text-blue-400 hover:text-blue-300 transition-colors underline"
          >
            LinkedIn Profile
          </a>
        </div>
      </footer>

      {/* Confirm Dialog */}
      {showConfirm && confirmData && (
        <ConfirmDialog
          operation={confirmData.operation}
          affectedObjects={confirmData.affected}
          onConfirm={handleConfirmExecution}
          onCancel={handleCancelExecution}
        />
      )}
    </div>
  );
}

// Main App with Routing
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import config from '../config';

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

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <div className="text-center">
          <p className="text-lg">No query executed yet</p>
          <p className="text-sm mt-2">Write a SQL query and press Execute to see results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Result Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          {/* Status Icon */}
          {result.success ? (
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Success</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">Error</span>
            </div>
          )}

          {/* Result Info */}
          {result.success && (
            <div className="text-sm text-gray-300">
              <span className="text-gray-500">Rows:</span>{' '}
              <span className="font-semibold">{result.row_count || 0}</span>
              <span className="mx-2 text-gray-600">|</span>
              <span className="text-gray-500">Time:</span>{' '}
              <span className="font-semibold">{result.execution_time}s</span>
            </div>
          )}

          {/* Warning */}
          {result.requires_confirmation && (
            <div className="flex items-center space-x-2 text-yellow-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{result.warning}</span>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        {result.success && result.data && result.data.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Export:</span>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Result Content */}
      <div className="flex-1">
        {result.success ? (
          result.data && result.data.length > 0 ? (
            // Data Grid
            <div className="ag-theme-alpine h-full" style={{ backgroundColor: '#111827' }}>
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
              />
            </div>
          ) : (
            // No data message
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-lg">{result.message || 'Query executed successfully'}</p>
              </div>
            </div>
          )
        ) : (
          // Error message
          <div className="flex items-center justify-center h-full text-red-400 p-4">
            <div className="text-center max-w-2xl">
              <XCircle className="w-12 h-12 mx-auto mb-2" />
              <p className="text-lg font-semibold mb-2">Query Error</p>
              <pre className="text-sm text-left bg-gray-800 p-4 rounded overflow-auto max-h-64">
                {result.error}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsGrid;
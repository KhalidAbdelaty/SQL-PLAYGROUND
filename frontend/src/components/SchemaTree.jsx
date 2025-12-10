import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Table, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw,
  Loader2,
  Lock
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ContextMenu from './ContextMenu';

const SchemaTree = ({ onTableClick, currentDatabase, onDatabaseChange, onTableSelect }) => {
  const { user, isAdmin, isSandbox } = useAuth();
  
  const [databases, setDatabases] = useState([]);
  const [expandedDatabases, setExpandedDatabases] = useState(new Set());
  const [schemaCache, setSchemaCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    loadDatabases();
  }, [user]);

  const loadDatabases = async (refreshSchemas = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getDatabases();
      let dbs = response.databases || [];
      
      // Filter databases based on user role
      if (isSandbox && user?.database_name) {
        // Sandbox users see ONLY their database
        dbs = dbs.filter(db => db.name === user.database_name);
      }
      
      setDatabases(dbs);
      
      // Refresh schemas for expanded databases if requested
      if (refreshSchemas) {
        for (const dbName of expandedDatabases) {
          await refreshSchema(dbName);
        }
      }
      
      // Auto-expand and select appropriate database
      if (dbs.length > 0) {
        let defaultDb;
        
        if (isSandbox && user?.database_name) {
          // Sandbox: use their database
          defaultDb = user.database_name;
        } else if (isAdmin) {
          // Admin: use first database or current selection
          defaultDb = currentDatabase || dbs[0].name;
        }
        
        if (defaultDb) {
          setExpandedDatabases(new Set([defaultDb]));
          loadSchema(defaultDb, refreshSchemas);
          if (!currentDatabase && onDatabaseChange) {
            onDatabaseChange(defaultDb);
          }
        }
      }
    } catch (err) {
      setError(err.error || 'Failed to load databases');
      console.error('Error loading databases:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSchema = async (dbName, forceRefresh = false) => {
    if (schemaCache[dbName] && !forceRefresh) return; // Already loaded

    try {
      const response = await apiService.getSchema(dbName);
      setSchemaCache(prev => ({
        ...prev,
        [dbName]: response
      }));
    } catch (err) {
      console.error(`Error loading schema for ${dbName}:`, err);
    }
  };

  const refreshSchema = async (dbName) => {
    // Clear cache and reload
    setSchemaCache(prev => {
      const newCache = { ...prev };
      delete newCache[dbName];
      return newCache;
    });
    await loadSchema(dbName, true);
  };

  const toggleDatabase = (dbName) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(dbName)) {
      newExpanded.delete(dbName);
    } else {
      newExpanded.add(dbName);
      loadSchema(dbName);
    }
    setExpandedDatabases(newExpanded);
  };

  const handleTableClick = (database, schema, table) => {
    if (onTableSelect) {
      onTableSelect({ database, schema, name: table });
    }
    if (onDatabaseChange) {
      onDatabaseChange(database);
    }
  };

  const handleTableDragStart = (e, database, schema, table) => {
    const tableName = `[${database}].[${schema}].[${table}]`;
    e.dataTransfer.setData('text/plain', tableName);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleRightClick = (e, database, schema, table) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      database,
      schema,
      table,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  if (loading && databases.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
        <p className="text-sm text-gray-400">Loading databases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 text-sm mb-2">{error}</p>
        <button
          onClick={loadDatabases}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Database className="w-4 h-4" />
          {isSandbox ? 'My Database' : 'Database Explorer'}
        </h2>
        <button
          onClick={() => loadDatabases(true)}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Refresh databases and schemas"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Role Badge */}
      {isSandbox && (
        <div className="px-3 py-2 bg-blue-900/30 border-b border-gray-700">
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <Lock className="w-3 h-3" />
            <span>Sandbox Environment - Isolated Access</span>
          </div>
        </div>
      )}

      {/* Database Tree */}
      <div className="flex-1 overflow-auto p-2">
        {databases.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No databases available
          </div>
        ) : (
          <div className="space-y-1">
            {databases.map((db) => (
              <DatabaseNode
                key={db.name}
                database={db}
                isExpanded={expandedDatabases.has(db.name)}
                schema={schemaCache[db.name]}
                onToggle={() => toggleDatabase(db.name)}
                onTableClick={handleTableClick}
                onTableDragStart={handleTableDragStart}
                onTableRightClick={handleRightClick}
                isSelected={currentDatabase === db.name}
                isSandbox={isSandbox}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          database={contextMenu.database}
          schema={contextMenu.schema}
          table={contextMenu.table}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

// Database Node Component
const DatabaseNode = ({ 
  database, 
  isExpanded, 
  schema, 
  onToggle, 
  onTableClick, 
  onTableDragStart,
  onTableRightClick,
  isSelected,
  isSandbox
}) => {
  const isLoading = isExpanded && !schema;

  return (
    <div>
      {/* Database Header */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-700 ${
          isSelected ? 'bg-gray-700' : ''
        }`}
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <Database className={`w-4 h-4 ${isSandbox ? 'text-blue-500' : 'text-purple-500'}`} />
        <span className="text-sm text-gray-200 flex-1">{database.name}</span>
        {isSandbox && (
          <Lock className="w-3 h-3 text-blue-400" />
        )}
      </div>

      {/* Tables */}
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading schema...
            </div>
          ) : schema?.tables && schema.tables.length > 0 ? (
            schema.tables.map((table) => (
              <div
                key={`${table.schema}.${table.name}`}
                className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-700"
                onClick={() => onTableClick(database.name, table.schema, table.name)}
                onContextMenu={(e) => onTableRightClick(e, database.name, table.schema, table.name)}
                draggable
                onDragStart={(e) => onTableDragStart(e, database.name, table.schema, table.name)}
              >
                <Table className="w-3 h-3 text-green-500" />
                <span className="text-xs text-gray-300">{table.schema}.{table.name}</span>
              </div>
            ))
          ) : (
            <div className="px-2 py-1 text-xs text-gray-500">
              No tables found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchemaTree;
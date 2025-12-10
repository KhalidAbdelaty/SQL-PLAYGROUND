import React, { useState, useEffect, memo } from 'react';
import { 
  Database, 
  Table, 
  ChevronRight, 
  ChevronDown, 
  RefreshCw,
  Loader2,
  Lock,
  Sparkles
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ContextMenu from './ContextMenu';

const SchemaTree = memo(({ onTableClick, currentDatabase, onDatabaseChange, onTableSelect }) => {
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
      
      if (isSandbox && user?.database_name) {
        dbs = dbs.filter(db => db.name === user.database_name);
      }
      
      setDatabases(dbs);
      
      if (refreshSchemas) {
        for (const dbName of expandedDatabases) {
          await refreshSchema(dbName);
        }
      }
      
      if (dbs.length > 0) {
        let defaultDb;
        
        if (isSandbox && user?.database_name) {
          defaultDb = user.database_name;
        } else if (isAdmin) {
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
    if (schemaCache[dbName] && !forceRefresh) return;

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
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-sm text-slate-400 mt-3">Loading databases...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <button
          onClick={() => loadDatabases()}
          className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-300 text-sm rounded-xl transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary-400" />
          <h2 className="text-sm font-semibold text-white">
            {isSandbox ? 'My Database' : 'Explorer'}
          </h2>
        </div>
        <button
          onClick={() => loadDatabases(true)}
          className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Role Badge */}
      {isSandbox && (
        <div className="px-4 py-2 bg-primary-500/10 border-b border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-primary-300">
            <Lock className="w-3 h-3" />
            <span>Sandbox Environment - Isolated Access</span>
          </div>
        </div>
      )}

      {/* Database Tree */}
      <div className="flex-1 overflow-auto p-3">
        {databases.length === 0 ? (
          <div className="p-4 text-center">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No databases available</p>
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
});

// Database Node Component - memoized for performance
const DatabaseNode = memo(({ 
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
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
          isSelected 
            ? 'bg-primary-500/20 border border-primary-500/30' 
            : 'hover:bg-slate-800/50'
        }`}
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
        <Database className={`w-4 h-4 ${isSandbox ? 'text-primary-400' : 'text-purple-400'}`} />
        <span className="text-sm text-white flex-1 truncate">{database.name}</span>
        {isSandbox && (
          <Sparkles className="w-3 h-3 text-primary-400" />
        )}
      </div>

      {/* Tables */}
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading schema...
            </div>
          ) : schema?.tables && schema.tables.length > 0 ? (
            schema.tables.map((table) => (
              <div
                key={`${table.schema}.${table.name}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-all group"
                onClick={() => onTableClick(database.name, table.schema, table.name)}
                onContextMenu={(e) => onTableRightClick(e, database.name, table.schema, table.name)}
                draggable
                onDragStart={(e) => onTableDragStart(e, database.name, table.schema, table.name)}
              >
                <Table className="w-3.5 h-3.5 text-accent-400 group-hover:text-accent-300" />
                <span className="text-xs text-slate-400 group-hover:text-white transition-colors truncate">
                  {table.schema}.{table.name}
                </span>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500">
              No tables found
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SchemaTree.displayName = 'SchemaTree';
DatabaseNode.displayName = 'DatabaseNode';

export default SchemaTree;

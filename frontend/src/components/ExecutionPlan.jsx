import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Activity, 
  Clock, 
  Cpu, 
  Database,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Zap,
  AlertTriangle
} from 'lucide-react';

const ExecutionPlan = ({ isOpen, onClose, planData }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(['root']));

  if (!isOpen) return null;

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Mock execution plan for demonstration
  const mockPlan = planData || {
    query: 'SELECT * FROM Users WHERE Status = 1',
    totalCost: 0.0234,
    estimatedRows: 1000,
    actualRows: 987,
    executionTime: 0.045,
    nodes: [
      {
        id: 'root',
        operation: 'SELECT',
        cost: 0.0234,
        rows: 987,
        details: 'Output: [Id], [Name], [Email], [Status]',
        children: [
          {
            id: 'filter',
            operation: 'Filter',
            cost: 0.0012,
            rows: 987,
            details: 'WHERE Status = 1',
            children: [
              {
                id: 'scan',
                operation: 'Clustered Index Scan',
                cost: 0.0222,
                rows: 5000,
                details: 'Object: [dbo].[Users].[PK_Users]',
                warning: 'Consider adding index on Status column',
                children: []
              }
            ]
          }
        ]
      }
    ]
  };

  const getOperationIcon = (operation) => {
    const op = operation.toLowerCase();
    if (op.includes('scan')) return <Database className="w-4 h-4" />;
    if (op.includes('seek')) return <Zap className="w-4 h-4" />;
    if (op.includes('filter')) return <Activity className="w-4 h-4" />;
    if (op.includes('sort')) return <ArrowRight className="w-4 h-4" />;
    return <Cpu className="w-4 h-4" />;
  };

  const getCostColor = (cost, totalCost) => {
    const percentage = (cost / totalCost) * 100;
    if (percentage > 50) return 'text-red-400';
    if (percentage > 25) return 'text-amber-400';
    return 'text-green-400';
  };

  const renderNode = (node, depth = 0, totalCost) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const costPercentage = ((node.cost / totalCost) * 100).toFixed(1);

    return (
      <motion.div
        key={node.id}
        className="mb-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.1 }}
      >
        <div
          className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
            node.warning 
              ? 'bg-amber-500/10 border border-amber-500/30' 
              : 'glass hover:border-primary-500/30'
          }`}
          onClick={() => hasChildren && toggleNode(node.id)}
          style={{ marginLeft: depth * 24 }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5" />
            </motion.div>
          ) : (
            <div className="w-4" />
          )}

          {/* Operation Icon */}
          <div className={`p-2 rounded-lg ${node.warning ? 'bg-amber-500/20' : 'bg-primary-500/20'}`}>
            {getOperationIcon(node.operation)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white">{node.operation}</span>
              {node.warning && (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">{node.details}</p>
            
            {node.warning && (
              <p className="text-xs text-amber-400 mt-1">{node.warning}</p>
            )}
          </div>

          {/* Stats */}
          <div className="text-right">
            <div className={`text-sm font-mono ${getCostColor(node.cost, totalCost)}`}>
              {costPercentage}%
            </div>
            <div className="text-xs text-slate-500">
              {node.rows.toLocaleString()} rows
            </div>
          </div>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children.map(child => renderNode(child, depth + 1, totalCost))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-xl">
              <Activity className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">Execution Plan</h2>
              <p className="text-sm text-slate-400">Query performance analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 p-4 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-400" />
            <span className="text-sm text-slate-400">Time:</span>
            <span className="text-sm font-mono text-white">{mockPlan.executionTime}s</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-slate-400">Cost:</span>
            <span className="text-sm font-mono text-white">{mockPlan.totalCost}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-400">Rows:</span>
            <span className="text-sm font-mono text-white">{mockPlan.actualRows.toLocaleString()}</span>
          </div>
        </div>

        {/* Query */}
        <div className="p-4 border-b border-slate-700/50">
          <pre className="text-sm font-mono text-slate-300 bg-slate-900/50 p-3 rounded-xl overflow-x-auto">
            {mockPlan.query}
          </pre>
        </div>

        {/* Plan Tree */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {mockPlan.nodes.map(node => renderNode(node, 0, mockPlan.totalCost))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                Low cost (&lt;25%)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                Medium (25-50%)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                High (&gt;50%)
              </span>
            </div>
            <motion.button
              onClick={onClose}
              className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-300 rounded-xl transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExecutionPlan;


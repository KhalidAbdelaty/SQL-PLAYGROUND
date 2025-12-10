import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Play, Loader2, Code2, Sparkles } from 'lucide-react';
import config from '../config';

const SQLEditor = ({ 
  value, 
  onChange, 
  onExecute, 
  isExecuting, 
  currentDatabase,
  onFormat 
}) => {
  const editorRef = useRef(null);
  
  // Use refs to always have access to latest props in Monaco commands
  const onExecuteRef = useRef(onExecute);
  const onChangeRef = useRef(onChange);
  const onFormatRef = useRef(onFormat);
  const isExecutingRef = useRef(isExecuting);
  
  // Keep refs in sync with props
  useEffect(() => {
    onExecuteRef.current = onExecute;
    onChangeRef.current = onChange;
    onFormatRef.current = onFormat;
    isExecutingRef.current = isExecuting;
  }, [onExecute, onChange, onFormat, isExecuting]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure SQL language settings
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: () => {
        const suggestions = [
          // SQL Keywords
          ...['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'DATABASE', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'TOP', 'LIMIT', 'OFFSET', 'UNION', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'].map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
          })),
        ];
        return { suggestions };
      }
    });

    // Add keyboard shortcuts - use refs to get latest props
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (isExecutingRef.current) return;
      
      const currentValue = editor.getValue();
      if (typeof currentValue !== 'string' || !currentValue.trim()) return;
      
      // Update the query state
      if (onChangeRef.current) {
        onChangeRef.current(currentValue);
      }
      
      // Execute using the ref to get the latest onExecute with current database
      if (onExecuteRef.current) {
        onExecuteRef.current(false, currentValue);
      }
    });

    // Format shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      if (onFormatRef.current) onFormatRef.current();
    });

    // Enable drag-and-drop for table names
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
      });

      editorDomNode.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tableName = e.dataTransfer.getData('text/plain');
        if (tableName && tableName.startsWith('[')) {
          const position = editor.getPosition();
          if (position) {
            editor.executeEdits('drop', [{
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              ),
              text: tableName
            }]);
            editor.setPosition({
              lineNumber: position.lineNumber,
              column: position.column + tableName.length
            });
            editor.focus();
          }
        }
      });
    }

    // Set editor options
    editor.updateOptions({
      fontSize: config.EDITOR_FONT_SIZE,
      lineHeight: config.EDITOR_LINE_HEIGHT,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontLigatures: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      padding: { top: 16, bottom: 16 },
    });
  };

  const handleExecute = (queryToExecute = null) => {
    if (!isExecuting && editorRef.current) {
      const currentValue = queryToExecute !== null && typeof queryToExecute === 'string' 
        ? queryToExecute 
        : editorRef.current.getValue();
      
      if (typeof currentValue !== 'string') {
        console.error('Invalid query value:', currentValue);
        return;
      }
      
      onChange(currentValue);
      onExecute(false, currentValue);
    }
  };

  return (
    <div className="flex flex-col h-full glass-dark">
      {/* Toolbar */}
      <motion.div 
        className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-700/50"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          {/* Execute Button */}
          <motion.button
            onClick={() => handleExecute()}
            disabled={isExecuting}
            className="relative flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium rounded-xl overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-accent-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <span className="relative flex items-center gap-2">
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run</span>
                  <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">Ctrl+↵</kbd>
                </>
              )}
            </span>
          </motion.button>
          
          {/* Format Button */}
          {onFormat && (
            <motion.button
              onClick={onFormat}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 glass rounded-xl text-slate-300 hover:text-white hover:border-primary-500/50 transition-all shrink-0"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Code2 className="w-4 h-4" />
              <span className="hidden sm:inline">Format</span>
            </motion.button>
          )}

          {/* Database Badge */}
          {currentDatabase && (
            <motion.div 
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 glass rounded-lg shrink-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary-400" />
              <span className="hidden sm:inline text-sm text-slate-400">Database:</span>
              <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-none">{currentDatabase}</span>
            </motion.div>
          )}
        </div>

        <div className="text-xs text-slate-500 hidden lg:block">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl+Enter</kbd> to execute
          {onFormat && (
            <> • <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl+Shift+F</kbd> to format</>
          )}
        </div>
      </motion.div>

      {/* Editor */}
      <div className="flex-1 relative">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
        
        <Editor
          height="100%"
          defaultLanguage="sql"
          theme="vs-dark"
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: true,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            contextmenu: true,
            folding: true,
            lineNumbers: 'on',
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbersMinChars: 3,
          }}
        />
      </div>
    </div>
  );
};

export default SQLEditor;

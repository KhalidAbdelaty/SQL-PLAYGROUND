import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2 } from 'lucide-react';
import config from '../config';

const SQLEditor = ({ 
  value, 
  onChange, 
  onExecute, 
  isExecuting, 
  database 
}) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure SQL language settings
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: () => {
        const suggestions = [
          // SQL Keywords
          ...['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'DATABASE', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN'].map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
          })),
        ];
        return { suggestions };
      }
    });

    // Add keyboard shortcuts
    // IMPORTANT: Get the current editor value at execution time, not at mount time
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // Get the current value from the editor instance
      const currentValue = editor.getValue();
      // Update parent state with current value
      onChange(currentValue);
      // Execute with the current value directly (pass it as parameter)
      // This ensures we execute the latest value, not the stale state
      handleExecute(currentValue);
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
          // Insert at cursor position
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
    });
  };

  const handleExecute = (queryToExecute = null) => {
    if (!isExecuting && editorRef.current) {
      // Get the current value from editor - ensure it's a string
      const currentValue = queryToExecute !== null && typeof queryToExecute === 'string' 
        ? queryToExecute 
        : editorRef.current.getValue();
      
      // Ensure we have a valid string
      if (typeof currentValue !== 'string') {
        console.error('Invalid query value:', currentValue);
        return;
      }
      
      // Update parent state with current value
      onChange(currentValue);
      // Execute with the current value (confirmDestructive=false, queryToExecute=currentValue)
      onExecute(false, currentValue);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Execute (Ctrl+Enter)</span>
              </>
            )}
          </button>
          
          {database && (
            <div className="text-sm text-gray-300">
              <span className="text-gray-500">Database:</span>{' '}
              <span className="font-semibold">{database}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400">
          Tip: Use Ctrl+Enter to execute query
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="sql"
          theme={config.EDITOR_THEME}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default SQLEditor;
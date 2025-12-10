import { useEffect, useRef, useState } from 'react';

// Define all available shortcuts
export const SHORTCUTS = {
  FORMAT_QUERY: {
    key: 'F',
    ctrl: true,
    shift: true,
    description: 'Format query',
    category: 'Query',
  },
  SAVE_QUERY: {
    key: 'Q',
    ctrl: true,
    shift: true,
    description: 'Save current query',
    category: 'Query',
  },
  NEW_QUERY: {
    key: 'K',
    ctrl: true,
    shift: false,
    description: 'New query (clear editor)',
    category: 'Query',
  },
  TOGGLE_SAVED_QUERIES: {
    key: 'O',
    ctrl: true,
    shift: true,
    description: 'Open saved queries',
    category: 'Navigation',
  },
  SHOW_SHORTCUTS: {
    key: 'H',
    ctrl: true,
    shift: true,
    description: 'Show keyboard shortcuts',
    category: 'Help',
  },
  ESCAPE: {
    key: 'Escape',
    ctrl: false,
    shift: false,
    description: 'Close dialogs/panels',
    category: 'General',
  },
};

// Hook for registering keyboard shortcuts
export const useKeyboardShortcuts = (handlers = {}) => {
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
  const handlersRef = useRef(handlers);
  
  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const key = event.key.toUpperCase();
      
      // Debug log - uncomment if needed
      // console.log('Key pressed:', { key, ctrl, shift });
      
      // Check ESCAPE first - always works
      if (event.key === 'Escape') {
        setShowShortcutsPanel(false);
        if (handlersRef.current.ESCAPE) {
          handlersRef.current.ESCAPE(event);
        }
        return;
      }
      
      // Check SHOW_SHORTCUTS: Ctrl+Shift+H
      if (ctrl && shift && key === 'H') {
        event.preventDefault();
        setShowShortcutsPanel(prev => !prev);
        return;
      }
      
      // Check FORMAT_QUERY: Ctrl+Shift+F
      if (ctrl && shift && key === 'F') {
        event.preventDefault();
        if (handlersRef.current.FORMAT_QUERY) {
          handlersRef.current.FORMAT_QUERY(event);
        }
        return;
      }
      
      // Check SAVE_QUERY: Ctrl+Shift+Q
      if (ctrl && shift && key === 'Q') {
        event.preventDefault();
        if (handlersRef.current.SAVE_QUERY) {
          handlersRef.current.SAVE_QUERY(event);
        }
        return;
      }
      
      // Check TOGGLE_SAVED_QUERIES: Ctrl+Shift+O
      if (ctrl && shift && key === 'O') {
        event.preventDefault();
        if (handlersRef.current.TOGGLE_SAVED_QUERIES) {
          handlersRef.current.TOGGLE_SAVED_QUERIES(event);
        }
        return;
      }
      
      // Check NEW_QUERY: Ctrl+K (no shift)
      if (ctrl && !shift && key === 'K') {
        event.preventDefault();
        if (handlersRef.current.NEW_QUERY) {
          handlersRef.current.NEW_QUERY(event);
        }
        return;
      }
    };

    // Add listener with capture to get events before Monaco
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []); // Empty deps - listener stays stable

  return {
    showShortcutsPanel,
    setShowShortcutsPanel,
  };
};

// Format shortcut for display
export const formatShortcut = (shortcut) => {
  const parts = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  
  let keyName = shortcut.key;
  if (keyName === 'Escape') keyName = 'Esc';
  
  parts.push(keyName);
  
  return parts.join(' + ');
};

// Get shortcuts grouped by category
export const getShortcutsByCategory = () => {
  const categories = {};
  
  for (const [name, shortcut] of Object.entries(SHORTCUTS)) {
    const category = shortcut.category || 'General';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({
      name,
      ...shortcut,
      formatted: formatShortcut(shortcut),
    });
  }
  
  return categories;
};

export default useKeyboardShortcuts;

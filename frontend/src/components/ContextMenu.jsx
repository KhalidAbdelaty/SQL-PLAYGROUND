import React, { useEffect, useRef } from 'react';
import { FileText, Hash, Database, Eye, List } from 'lucide-react';

const ContextMenu = ({ x, y, items, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const getIcon = (type) => {
    switch (type) {
      case 'select':
      case 'select_all':
        return <Eye className="w-4 h-4" />;
      case 'count':
        return <Hash className="w-4 h-4" />;
      case 'describe':
        return <List className="w-4 h-4" />;
      case 'top10':
        return <FileText className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50 min-w-48"
      style={{ top: y, left: x }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.action();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center space-x-2 text-gray-200"
        >
          {getIcon(item.type)}
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="ml-auto text-xs text-gray-500">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;


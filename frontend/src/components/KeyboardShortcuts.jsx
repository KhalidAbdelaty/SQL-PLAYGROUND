import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { getShortcutsByCategory } from '../hooks/useKeyboardShortcuts';

const KeyboardShortcuts = ({ isOpen, onClose }) => {
  const categories = getShortcutsByCategory();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900/95 border border-primary-500/30 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-xl">
              <Keyboard className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-slate-400">Speed up your workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {Object.entries(categories).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.name}
                      className="flex items-center justify-between p-3 rounded-xl glass"
                    >
                      <span className="text-sm text-slate-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-xs font-mono text-slate-300">
                        {shortcut.formatted}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Additional info about Monaco shortcuts */}
          <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Editor Shortcuts</h3>
            <p className="text-xs text-slate-500 mb-3">
              The SQL editor (Monaco) has its own built-in shortcuts:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Execute query</span>
                <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + ↵</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Find</span>
                <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + F</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Replace</span>
                <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + H</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Comment line</span>
                <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + /</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Undo</span>
                <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + Z</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Redo</span>
                <kbd className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + Y</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
          <p className="text-center text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + Shift + H</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;

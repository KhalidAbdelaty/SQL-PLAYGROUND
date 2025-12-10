import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  StarOff, 
  Trash2, 
  Play, 
  Save, 
  X, 
  Search,
  Plus,
  Folder,
  Tag,
  Clock,
  Loader2
} from 'lucide-react';
import { apiService } from '../services/api';
import { showToast } from './Toast';

const SavedQueries = ({ onSelectQuery, onClose, currentQuery, initialShowSaveForm = false }) => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(initialShowSaveForm);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    tags: '',
    is_favorite: false
  });

  const loadQueries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getSavedQueries({
        search,
        favorites_only: showFavoritesOnly
      });
      setQueries(response.queries || []);
    } catch (err) {
      console.error('Error loading saved queries:', err);
      showToast.error('Failed to load saved queries');
    } finally {
      setLoading(false);
    }
  }, [search, showFavoritesOnly]);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  const handleSave = async () => {
    if (!saveForm.name.trim()) {
      showToast.warning('Please enter a query name');
      return;
    }

    try {
      await apiService.saveQuery({
        name: saveForm.name,
        query: currentQuery,
        description: saveForm.description,
        tags: saveForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        is_favorite: saveForm.is_favorite
      });
      showToast.success('Query saved successfully');
      setShowSaveForm(false);
      setSaveForm({ name: '', description: '', tags: '', is_favorite: false });
      loadQueries();
    } catch (err) {
      console.error('Error saving query:', err);
      showToast.error('Failed to save query');
    }
  };

  const handleDelete = async (queryId) => {
    try {
      await apiService.deleteSavedQuery(queryId);
      showToast.success('Query deleted');
      loadQueries();
    } catch (err) {
      console.error('Error deleting query:', err);
      showToast.error('Failed to delete query');
    }
  };

  const handleToggleFavorite = async (queryId) => {
    try {
      await apiService.toggleQueryFavorite(queryId);
      loadQueries();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-slate-900 border border-primary-500/30 rounded-2xl shadow-2xl flex flex-col animate-scale-in"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-xl">
              <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-white">Saved Queries</h2>
              <p className="text-xs sm:text-sm text-slate-400">{queries.length} queries</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {currentQuery && (
              <button
                onClick={() => setShowSaveForm(true)}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Save Current</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 p-4 border-b border-slate-700/50 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search queries..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors text-sm"
            />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
              showFavoritesOnly 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Favorites</span>
          </button>
        </div>

        {/* Save Form - Slide-in Panel */}
        {showSaveForm && (
          <div 
            className="absolute inset-0 z-20 rounded-2xl overflow-hidden"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            {/* Dark overlay */}
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowSaveForm(false)}
            />
            
            {/* Slide-in panel from right */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-primary-500/20 shadow-2xl flex flex-col"
              style={{ animation: 'slideInRight 0.25s ease-out' }}
            >
              {/* Header */}
              <div className="flex-none flex items-center justify-between p-5 border-b border-slate-700/50 bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <Save className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-white">Save Query</h3>
                    <p className="text-xs text-slate-400">Store for quick access</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSaveForm(false)}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              {/* Form Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Query Name <span className="text-primary-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={saveForm.name}
                    onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                    placeholder="e.g., Monthly Sales Report"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:bg-slate-900 transition-all"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={saveForm.description}
                    onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                    placeholder="What does this query do?"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:bg-slate-900 transition-all resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={saveForm.tags}
                    onChange={(e) => setSaveForm({ ...saveForm, tags: e.target.value })}
                    placeholder="sales, report, monthly"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:bg-slate-900 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">Separate with commas</p>
                </div>
                
                <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg cursor-pointer hover:border-primary-500/30 hover:bg-primary-500/5 transition-all group">
                  <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                    saveForm.is_favorite 
                      ? 'bg-amber-500 text-white' 
                      : 'border-2 border-slate-600 group-hover:border-amber-500/50'
                  }`}>
                    {saveForm.is_favorite && <Star className="w-3 h-3 fill-current" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={saveForm.is_favorite}
                    onChange={(e) => setSaveForm({ ...saveForm, is_favorite: e.target.checked })}
                    className="sr-only"
                  />
                  <div>
                    <span className="text-sm text-slate-200 font-medium">Add to Favorites</span>
                    <p className="text-xs text-slate-500">Quick access from favorites filter</p>
                  </div>
                </label>
              </div>
              
              {/* Actions - Fixed Bottom */}
              <div className="flex-none p-5 bg-slate-800/50 border-t border-slate-700/50">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSaveForm(false)}
                    className="flex-1 px-4 py-3 text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-primary-500/25"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Queries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : queries.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No saved queries yet</p>
              <p className="text-sm text-slate-500 mt-1">Save your frequently used queries for quick access</p>
            </div>
          ) : (
            queries.map((query) => (
              <div
                key={query.id}
                className="group p-3 sm:p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-primary-500/30 rounded-xl transition-colors cursor-pointer"
                onClick={() => {
                  onSelectQuery(query.query);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate text-sm sm:text-base">{query.name}</h4>
                      {query.is_favorite && (
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    {query.description && (
                      <p className="text-xs sm:text-sm text-slate-400 mb-2 line-clamp-1">{query.description}</p>
                    )}
                    <pre className="text-xs text-slate-500 font-mono bg-slate-900/50 p-2 rounded-lg overflow-hidden whitespace-pre-wrap break-all">
                      {query.query.length > 80 ? query.query.substring(0, 80) + '...' : query.query}
                    </pre>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(query.updated_at)}
                      </span>
                      {query.tags?.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {query.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                              {tag}
                            </span>
                          ))}
                          {query.tags.length > 2 && (
                            <span className="text-xs text-slate-500">+{query.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(query.id);
                      }}
                      className="p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors"
                      title={query.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {query.is_favorite ? (
                        <StarOff className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Star className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectQuery(query.query);
                        onClose();
                      }}
                      className="p-1.5 sm:p-2 hover:bg-primary-500/20 rounded-lg transition-colors"
                      title="Load query"
                    >
                      <Play className="w-4 h-4 text-primary-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showToast.action('Delete this query?', 'Delete', () => handleDelete(query.id));
                      }}
                      className="p-1.5 sm:p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete query"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-slate-700/50 text-center shrink-0">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavedQueries;

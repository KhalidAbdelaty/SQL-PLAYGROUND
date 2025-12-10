import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Clock, LogOut, RefreshCw, User, Database, AlertCircle, X } from 'lucide-react';

const SessionHeader = () => {
  const { user, sessionExpiry, extendSession, logout, isAdmin, isSandbox } = useAuth();
  
  const [timeLeft, setTimeLeft] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [extendHours, setExtendHours] = useState(8);
  const [cleanupOnLogout, setCleanupOnLogout] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionExpiry) return;

    const timer = setInterval(() => {
      const now = new Date();
      const expiry = new Date(sessionExpiry);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      // Show warning if less than 10 minutes
      if (minutes < 10 && !showWarning) {
        setShowWarning(true);
      }

      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${mins}m`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionExpiry, showWarning]);

  const handleExtend = async () => {
    setLoading(true);
    const result = await extendSession(extendHours);
    setLoading(false);

    if (result.success) {
      setShowExtendDialog(false);
      setShowWarning(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout(cleanupOnLogout);
    // Auth context will handle redirect
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${user ? 'bg-green-500' : 'bg-red-500'}`} />
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">{user?.username}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              isAdmin ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'
            }`}>
              {user?.role}
            </span>
          </div>

          {isSandbox && user?.database_name && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Database className="w-4 h-4" />
              <span className="font-mono text-xs">{user.database_name}</span>
            </div>
          )}
        </div>

        {/* Session Info & Actions */}
        <div className="flex items-center gap-3">
          {/* Session Timer */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded ${
            showWarning ? 'bg-red-900/50 text-red-300' : 'bg-gray-700 text-gray-300'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">{timeLeft}</span>
          </div>

          {/* Extend Session Button */}
          <button
            onClick={() => setShowExtendDialog(true)}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
            title="Extend session"
          >
            <RefreshCw className="w-4 h-4" />
            Extend
          </button>

          {/* Logout Button */}
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Expiry Warning Banner */}
      {showWarning && (
        <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
            <div>
              <p className="text-sm text-red-200 font-medium">Session Expiring Soon</p>
              <p className="text-xs text-red-300 mt-0.5">
                Your session will expire in less than 10 minutes. Extend now to keep working.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Extend Session Dialog */}
      {showExtendDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Extend Session</h3>
            
            <p className="text-sm text-gray-300 mb-4">
              Extend your session to continue working. You can extend up to 24 hours total.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Extend by (hours):
              </label>
              <select
                value={extendHours}
                onChange={(e) => setExtendHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExtend}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-colors"
              >
                {loading ? 'Extending...' : 'Extend Session'}
              </button>
              <button
                onClick={() => setShowExtendDialog(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Logout Confirmation</h3>
            
            {isSandbox ? (
              <>
                <p className="text-sm text-gray-300 mb-4">
                  Do you want to delete your sandbox database?
                </p>

                <div className="bg-gray-900/50 border border-gray-600 rounded p-4 mb-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="cleanup"
                      checked={cleanupOnLogout}
                      onChange={() => setCleanupOnLogout(true)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">Yes, delete everything</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Your database and all data will be permanently deleted.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="cleanup"
                      checked={!cleanupOnLogout}
                      onChange={() => setCleanupOnLogout(false)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">No, keep for next login</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Database will persist until session expires ({timeLeft} remaining).
                      </p>
                    </div>
                  </label>
                </div>

                {cleanupOnLogout && (
                  <div className="bg-red-900/30 border border-red-700 rounded p-3 mb-4">
                    <p className="text-xs text-red-200">
                      ⚠️ <strong>Warning:</strong> This action cannot be undone. All tables, 
                      views, and data in your sandbox will be permanently lost.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-300 mb-4">
                Are you sure you want to logout?
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                disabled={loading}
                className={`flex-1 px-4 py-2 ${
                  cleanupOnLogout && isSandbox
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:bg-gray-600 text-white rounded transition-colors`}
              >
                {loading ? 'Logging out...' : 
                 cleanupOnLogout && isSandbox ? 'Logout & Delete' : 
                 'Logout'}
              </button>
              <button
                onClick={() => setShowLogoutDialog(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHeader;
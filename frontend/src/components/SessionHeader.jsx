import React, { useState, useEffect, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Clock, 
  LogOut, 
  RefreshCw, 
  User, 
  Database, 
  AlertCircle, 
  X,
  Shield,
  Sparkles
} from 'lucide-react';

const SessionHeader = memo(() => {
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
  };

  return (
    <>
      <div className="relative z-20 glass-dark border-b border-slate-700/50 px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between">
          {/* User Info */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Avatar */}
              <div className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isAdmin 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                  : 'bg-gradient-to-br from-primary-500 to-accent-500'
              }`}>
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-slate-900" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white max-w-[100px] sm:max-w-none truncate">{user?.username}</span>
                  <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full ${
                    isAdmin 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  }`}>
                    {isAdmin ? (
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        <span className="hidden sm:inline">Admin</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span className="hidden sm:inline">Sandbox</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {isSandbox && user?.database_name && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 glass rounded-lg text-sm">
                <Database className="w-4 h-4 text-accent-400" />
                <span className="font-mono text-xs text-slate-300">{user.database_name}</span>
              </div>
            )}
          </div>

          {/* Session Info & Actions */}
          <div className="flex items-center gap-2">
            {/* Session Timer */}
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg ${
              showWarning 
                ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                : 'glass text-slate-300'
            }`}>
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-mono">{timeLeft}</span>
            </div>

            {/* Extend Session Button */}
            <button
              onClick={() => setShowExtendDialog(true)}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 text-primary-300 text-sm rounded-lg transition-all"
              title="Extend Session"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Extend</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutDialog(true)}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 glass text-slate-400 hover:text-white hover:border-red-500/30 text-sm rounded-lg transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Expiry Warning Banner */}
        {showWarning && (
          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start justify-between animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium">Session Expiring Soon</p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  Your session will expire in less than 10 minutes.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWarning(false)}
              className="text-red-400/70 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Extend Session Dialog */}
      {showExtendDialog && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowExtendDialog(false)}
        >
          <div 
            className="bg-slate-900/95 border border-slate-700/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-display font-bold text-white mb-2">Extend Session</h3>
            <p className="text-sm text-slate-400 mb-6">
              Extend your session to continue working. Maximum 24 hours.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Extend by:
              </label>
              <select
                value={extendHours}
                onChange={(e) => setExtendHours(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExtend}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium rounded-xl disabled:opacity-50 transition-all hover:shadow-glow"
              >
                {loading ? 'Extending...' : 'Extend Session'}
              </button>
              <button
                onClick={() => setShowExtendDialog(false)}
                disabled={loading}
                className="px-4 py-3 glass text-slate-300 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowLogoutDialog(false)}
        >
          <div 
            className="bg-slate-900/95 border border-slate-700/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-display font-bold text-white mb-2">Logout</h3>
            
            {isSandbox ? (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  Do you want to delete your sandbox database?
                </p>

                <div className="space-y-3 mb-6">
                  <label 
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      cleanupOnLogout 
                        ? 'bg-red-500/10 border-red-500/30' 
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cleanup"
                      checked={cleanupOnLogout}
                      onChange={() => setCleanupOnLogout(true)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">Yes, delete everything</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Your database and all data will be permanently deleted.
                      </p>
                    </div>
                  </label>

                  <label 
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      !cleanupOnLogout 
                        ? 'bg-primary-500/10 border-primary-500/30' 
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cleanup"
                      checked={!cleanupOnLogout}
                      onChange={() => setCleanupOnLogout(false)}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">No, keep for next login</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Database persists until session expires ({timeLeft} remaining).
                      </p>
                    </div>
                  </label>
                </div>

                {cleanupOnLogout && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
                    <p className="text-xs text-red-300">
                      ⚠️ <strong>Warning:</strong> This action cannot be undone.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 mb-6">
                Are you sure you want to logout?
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                disabled={loading}
                className={`flex-1 px-4 py-3 font-medium rounded-xl disabled:opacity-50 transition-all ${
                  cleanupOnLogout && isSandbox
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                }`}
              >
                {loading ? 'Logging out...' : 
                 cleanupOnLogout && isSandbox ? 'Logout & Delete' : 
                 'Logout'}
              </button>
              <button
                onClick={() => setShowLogoutDialog(false)}
                disabled={loading}
                className="px-4 py-3 glass text-slate-300 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SessionHeader.displayName = 'SessionHeader';

export default SessionHeader;

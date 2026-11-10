import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Monitor, LogOut, Shield, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    if (window.confirm('Are you sure you want to log out of PinPic?')) {
      try {
        setIsLoggingOut(true);
        await logout();
        showToast('Logged out successfully', 'info');
        navigate('/login', { replace: true });
      } catch (err) {
        console.error('Logout error:', err);
        showToast('Logged out', 'info');
        navigate('/login', { replace: true });
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-pinpic-bg-light dark:bg-pinpic-bg-dark text-pinpic-text-primary-light dark:text-pinpic-text-primary-dark pb-28 pt-4 px-4 sm:px-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 border-b border-pinpic-border-light dark:border-pinpic-outline-dark mb-6">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Theme / Appearance Section */}
        <div className="bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark p-5 rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-3">
            Appearance
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setThemeMode(opt.id)}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-pinpic-coral text-white border-pinpic-coral shadow-sm'
                      : 'bg-white dark:bg-pinpic-surface-dark border-pinpic-border-light dark:border-pinpic-outline-dark text-pinpic-text-secondary-light hover:border-pinpic-coral/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark p-5 rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-pinpic-text-secondary-light dark:text-pinpic-text-secondary-dark mb-2">
            Account Details
          </h3>
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-pinpic-border-light/60 dark:border-pinpic-outline-dark/60">
            <span className="text-pinpic-text-secondary-light font-medium">Username</span>
            <span className="font-semibold">@{user?.username || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1.5 border-b border-pinpic-border-light/60 dark:border-pinpic-outline-dark/60">
            <span className="text-pinpic-text-secondary-light font-medium">Email</span>
            <span className="font-semibold">{user?.email || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1.5">
            <span className="text-pinpic-text-secondary-light font-medium">User ID</span>
            <span className="font-mono text-[11px] text-pinpic-text-secondary-light truncate max-w-[180px]">
              {user?.userId || '—'}
            </span>
          </div>
        </div>

        {/* About PinPic */}
        <div className="bg-pinpic-surface-light dark:bg-pinpic-surface-container-dark p-5 rounded-3xl border border-pinpic-border-light dark:border-pinpic-outline-dark shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-pinpic-coral/10 text-pinpic-coral">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">PinPic Web</h4>
              <p className="text-xs text-pinpic-text-secondary-light">Version 1.0.0 • Connected to PinPic API</p>
            </div>
          </div>
        </div>

        {/* Logout CTA */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full py-3.5 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 text-red-500 border border-red-500/20 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          <LogOut className="w-4 h-4" />
          <span>{isLoggingOut ? 'Logging Out...' : 'Log Out'}</span>
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;


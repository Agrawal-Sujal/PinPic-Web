import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { clearLocalDatabase } from '../db/appDatabase';
import syncScheduler from '../sync/syncScheduler';
import deviceService from '../services/deviceService';
import { notifyRepositoryChanged } from '../data/localPhotoRepository';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('pinpic_jwt_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pinpic_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem('pinpic_onboarded') === 'true';
  });

  const refreshProfile = useCallback(async () => {
    if (!token) return null;
    try {
      const profile = await userApi.getProfile();
      const resolvedUserId = profile?.id || profile?.userId;
      setUser(prev => {
        const updated = {
          ...prev,
          ...profile,
          userId: resolvedUserId || prev?.userId,
        };
        localStorage.setItem('pinpic_user', JSON.stringify(updated));
        return updated;
      });
      return profile;
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      return null;
    }
  }, [token]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        const profile = await refreshProfile();
        const currentUserId =
          profile?.id || profile?.userId || user?.userId || user?.id;
        if (currentUserId) {
          deviceService.getOrRegisterDeviceId(currentUserId).catch(() => {});
          syncScheduler.startPeriodicSync(currentUserId);
        } else {
          syncScheduler.startPeriodicSync();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token, refreshProfile]);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data.jwt) {
      localStorage.setItem('pinpic_jwt_token', data.jwt);
      const initialUser = {
        userId: data.userId,
        email: data.emailId || email,
        username: data.username,
        pictureUrl: data.profileUrl,
      };
      localStorage.setItem('pinpic_user', JSON.stringify(initialUser));
      setToken(data.jwt);
      setUser(initialUser);

      // Register device & start sync engine
      deviceService.getOrRegisterDeviceId(data.userId).catch(() => {});
      syncScheduler.startPeriodicSync(data.userId);

      // Fetch full profile immediately
      try {
        const profile = await userApi.getProfile();
        const merged = { ...initialUser, ...profile };
        setUser(merged);
        localStorage.setItem('pinpic_user', JSON.stringify(merged));
      } catch (e) {
        console.warn('Initial profile fetch failed:', e);
      }
    }
    return data;
  };

  const register = async (name, email, password) => {
    await authApi.register({ name, email, password });
    // After register, perform login directly
    return await login(email, password);
  };

  const setUsername = async (newUsername) => {
    await authApi.setUsername(newUsername);
    setUser(prev => {
      const updated = { ...prev, username: newUsername };
      localStorage.setItem('pinpic_user', JSON.stringify(updated));
      return updated;
    });
  };

  const completeOnboarding = () => {
    localStorage.setItem('pinpic_onboarded', 'true');
    setHasCompletedOnboarding(true);
  };

  const logout = async () => {
    // 1. Stop background sync and cancel running sync operations
    syncScheduler.stopPeriodicSync();

    // 2. Clear all tables in local IndexedDB database
    await clearLocalDatabase();

    // 3. Clear Cache API if supported by the browser
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((k) => window.caches.delete(k)));
      } catch (err) {
        console.warn('Failed to clear Cache API storage:', err);
      }
    }

    // 4. Clear all browser storage (localStorage, sessionStorage)
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.warn('Failed to clear browser storage:', err);
    }

    // 5. Reset auth and onboarding React state
    setToken(null);
    setUser(null);
    setHasCompletedOnboarding(false);

    // 6. Notify repository listeners that local data has been wiped
    notifyRepositoryChanged();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        hasCompletedOnboarding,
        login,
        register,
        setUsername,
        completeOnboarding,
        logout,
        refreshProfile,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};


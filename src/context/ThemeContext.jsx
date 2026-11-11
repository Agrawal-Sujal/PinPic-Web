import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'pinpic_theme_mode';
const THEME_EXPLICIT_KEY = 'pinpic_theme_explicit';
const VALID_THEMES = ['light', 'dark', 'system'];
const DEFAULT_THEME = 'light';

const getInitialThemeMode = () => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (!VALID_THEMES.includes(saved)) return DEFAULT_THEME;
    // Earlier builds auto-wrote 'system' on first load; keep light as default unless explicitly chosen
    if (saved === 'system' && localStorage.getItem(THEME_EXPLICIT_KEY) !== 'true') {
      return DEFAULT_THEME;
    }
    return saved;
  } catch {
    return DEFAULT_THEME;
  }
};

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(getInitialThemeMode);
  const [resolvedDark, setResolvedDark] = useState(false);

  const setThemeMode = useCallback((nextMode) => {
    const resolved = VALID_THEMES.includes(nextMode) ? nextMode : DEFAULT_THEME;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, resolved);
      localStorage.setItem(THEME_EXPLICIT_KEY, 'true');
    } catch {
      // Ignore storage failures in restricted contexts
    }
    setThemeModeState(resolved);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (themeMode === 'system') {
        isDark = mediaQuery.matches;
      } else {
        isDark = themeMode === 'dark';
      }

      setResolvedDark(isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const listener = () => {
      if (themeMode === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, isDark: resolvedDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};


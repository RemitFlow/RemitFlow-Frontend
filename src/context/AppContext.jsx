
import { createContext, useContext, useEffect, useState } from 'react';
import {
  connectWallet,
  getStoredWallet,
  disconnectWallet,
} from '../services/wallet.js';
import { getUserErrorMessage, normalizeError } from '../services/errors.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import {
  DEFAULT_LOCALE,
  LOCALES,
  isSupportedLocale,
} from '../constants/locales.js';

const LOCALE_STORAGE_KEY = 'remitflow:locale';
const THEME_STORAGE_KEY = 'remitflow:theme';

const SUPPORTED_THEMES = ['dark', 'light', 'system'];

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'dark';
}

// Global app context: holds the connected wallet, locale preference, theme preference,
// and exposes actions for all of them.
const AppContext = createContext(null);

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.connectTimeoutMs=30000] - Wallet connection timeout in ms
 */

export function AppProvider({ children, connectTimeoutMs = 30000 }) {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [storedLocale, setStoredLocale] = useLocalStorage(
    LOCALE_STORAGE_KEY,
    DEFAULT_LOCALE,
  );

  const [rawTheme, setRawTheme] = useLocalStorage(THEME_STORAGE_KEY, 'dark');

  const theme = SUPPORTED_THEMES.includes(rawTheme) ? rawTheme : 'dark';

  function setTheme(newTheme) {
    setRawTheme(SUPPORTED_THEMES.includes(newTheme) ? newTheme : 'dark');
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    }
  }, [resolvedTheme]);

  // Guard against a stale or tampered value in localStorage (e.g. left over
  // from a version that supported a different set of locales).
  const locale = isSupportedLocale(storedLocale)
    ? storedLocale
    : DEFAULT_LOCALE;

  function setLocale(code) {
    setStoredLocale(isSupportedLocale(code) ? code : DEFAULT_LOCALE);
  }

  // Restore a previously connected wallet on first render.
  useEffect(() => {
    const stored = getStoredWallet();
    if (stored) setWallet(stored);
  }, []);

  async function connect() {
    setConnecting(true);
    setConnectionError(null);

    try {
      // Add a timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Connection timeout')),
          connectTimeoutMs,
        ),
      );

      const account = await Promise.race([connectWallet(), timeoutPromise]);
      setWallet(account);
      return account;
    } catch (err) {
      const normalized = normalizeError(err, { source: 'wallet' });
      setConnectionError(getUserErrorMessage(normalized));
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    disconnectWallet();
    setWallet(null);
    setConnectionError(null);
  }

  const value = {
    wallet,
    connecting,
    connectionError,
    isConnected: Boolean(wallet),
    connect,
    disconnect,
    locale,
    setLocale,
    locales: LOCALES,
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Access the app context.
 * @returns {object} the context value
 */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}

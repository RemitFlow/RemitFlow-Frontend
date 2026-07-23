import { createContext, useContext, useEffect, useState } from 'react'
import { connectWallet, getStoredWallet, disconnectWallet } from '../services/wallet.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { DEFAULT_LOCALE, LOCALES, isSupportedLocale } from '../constants/locales.js'

const LOCALE_STORAGE_KEY = 'remitflow:locale'

// Global app context: holds the connected wallet, the locale preference used
// for currency/date/number formatting, and exposes the actions for both.
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [storedLocale, setStoredLocale] = useLocalStorage(LOCALE_STORAGE_KEY, DEFAULT_LOCALE)

  // Guard against a stale or tampered value in localStorage (e.g. left over
  // from a version that supported a different set of locales).
  const locale = isSupportedLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE

  function setLocale(code) {
    setStoredLocale(isSupportedLocale(code) ? code : DEFAULT_LOCALE)
  }

  // Restore a previously connected wallet on first render.
  useEffect(() => {
    const stored = getStoredWallet()
    if (stored) setWallet(stored)
  }, [])

  async function connect() {
    setConnecting(true)
    setConnectionError(null)
    
    try {
      // Add a timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 30000)
      )
      
      const account = await Promise.race([connectWallet(), timeoutPromise])
      setWallet(account)
      return account
    } catch (err) {
      // Handle rejected connections (user cancellation, timeout, or other errors)
      const errorMessage = err.message || 'Failed to connect wallet'
      setConnectionError(errorMessage)
      throw err
    } finally {
      setConnecting(false)
    }
  }

  function disconnect() {
    disconnectWallet()
    setWallet(null)
    setConnectionError(null)
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
    locales: LOCALES
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * Access the app context.
 * @returns {object} the context value
 */
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return ctx
}

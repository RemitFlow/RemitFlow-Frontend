import { createContext, useContext, useEffect, useState } from 'react'
import { connectWallet, getStoredWallet, disconnectWallet } from '../services/wallet.js'

// Global app context: holds the connected wallet and exposes wallet actions.
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [density, setDensityState] = useState(() =>
    localStorage.getItem('remitflow:density') === 'compact' ? 'compact' : 'comfortable'
  )

  // Restore a previously connected wallet on first render.
  useEffect(() => {
    const stored = getStoredWallet()
    if (stored) setWallet(stored)
  }, [])

  // Apply the initial density attribute on mount so first paint is correct.
  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])

  // Persist + apply density whenever it changes.
  function setDensity(next) {
    const value = next === 'compact' ? 'compact' : 'comfortable'
    setDensityState(value)
    localStorage.setItem('remitflow:density', value)
    document.documentElement.dataset.density = value
  }

  async function connect() {
    setConnecting(true)
    try {
      const account = await connectWallet()
      setWallet(account)
      return account
    } finally {
      setConnecting(false)
    }
  }

  function disconnect() {
    disconnectWallet()
    setWallet(null)
  }

  const value = {
    wallet,
    connecting,
    isConnected: Boolean(wallet),
    connect,
    disconnect,
    density,
    setDensity
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

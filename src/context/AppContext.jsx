import { createContext, useContext, useEffect, useState } from 'react'
import { connectWallet, getStoredWallet, disconnectWallet, signTransaction } from '../services/wallet.js'

// Global app context: holds the connected wallet and exposes wallet actions.
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [wallet, setWallet] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [signing, setSigning] = useState(false)

  // Restore a previously connected wallet on first render.
  useEffect(() => {
    const stored = getStoredWallet()
    if (stored) setWallet(stored)
  }, [])

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

  async function sign(payload) {
    setSigning(true)
    try {
      return await signTransaction(payload)
    } finally {
      setSigning(false)
    }
  }

  const value = {
    wallet,
    connecting,
    signing,
    isConnected: Boolean(wallet),
    connect,
    disconnect,
    sign
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

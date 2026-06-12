// Mock Stellar wallet service.
// In production this would wrap Freighter / Albedo or the Stellar SDK keypair
// signing flow. Here it simply fakes connecting to a wallet with no network.

const STORAGE_KEY = 'remitflow.wallet'

// A deterministic fake Stellar public key for demo purposes.
const DEMO_PUBLIC_KEY = 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF'

/**
 * Simulate connecting a Stellar wallet.
 * @returns {Promise<{publicKey: string, balance: number}>}
 */
export function connectWallet() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const account = {
        publicKey: DEMO_PUBLIC_KEY,
        balance: 1000
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
      } catch (err) {
        // localStorage may be unavailable; ignore for the demo.
      }
      resolve(account)
    }, 600)
  })
}

/**
 * Read a previously connected wallet from storage, if any.
 * @returns {{publicKey: string, balance: number}|null}
 */
export function getStoredWallet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    return null
  }
}

/**
 * Forget the connected wallet.
 */
export function disconnectWallet() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    // ignore
  }
}

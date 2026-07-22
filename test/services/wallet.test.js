import { describe, expect, it, beforeEach, vi } from 'vitest'
import { connectWallet, signTransaction, getStoredWallet, disconnectWallet } from '../../src/services/wallet.js'

describe('connectWallet', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset random number generator to ensure consistent test behavior
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // Ensures no rejection in most tests
  })

  it('resolves with wallet account data on successful connection', async () => {
    const account = await connectWallet()
    expect(account).toHaveProperty('publicKey')
    expect(account).toHaveProperty('balance')
    expect(typeof account.publicKey).toBe('string')
    expect(typeof account.balance).toBe('number')
  })

  it('stores the connected wallet in localStorage', async () => {
    const account = await connectWallet()
    const stored = getStoredWallet()
    expect(stored).toEqual(account)
  })

  it('rejects with an error when user rejects the connection', async () => {
    // Mock rejection scenario (10% chance in implementation)
    Math.random.mockReturnValue(0.05)
    
    await expect(connectWallet()).rejects.toThrow('User rejected the connection request')
    
    // Verify wallet was not stored
    const stored = getStoredWallet()
    expect(stored).toBeNull()
  })

  it('does not store wallet data on rejection', async () => {
    Math.random.mockReturnValue(0.05) // Force rejection
    
    try {
      await connectWallet()
    } catch (err) {
      // Expected to throw
    }
    
    expect(getStoredWallet()).toBeNull()
  })
})

describe('signTransaction', () => {
  it('resolves with a unique signature, simulating the wallet signing prompt', async () => {
    const result = await signTransaction({
      recipient: 'amina@example.com',
      sendAmount: 15,
    });
    expect(typeof result.signature).toBe('string');
    expect(result.signature.startsWith('SIGNED_')).toBe(true);
  });

  it('produces a different signature for each call', async () => {
    const first = await signTransaction({ sendAmount: 10 })
    const second = await signTransaction({ sendAmount: 20 })
    expect(first.signature).not.toBe(second.signature)
  })
})

describe('getStoredWallet', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no wallet is stored', () => {
    expect(getStoredWallet()).toBeNull()
  })

  it('returns the stored wallet account', () => {
    const account = { publicKey: 'GTEST123', balance: 500 }
    localStorage.setItem('remitflow.wallet', JSON.stringify(account))
    expect(getStoredWallet()).toEqual(account)
  })

  it('returns null if stored data is invalid JSON', () => {
    localStorage.setItem('remitflow.wallet', 'invalid json')
    expect(getStoredWallet()).toBeNull()
  })
})

describe('disconnectWallet', () => {
  it('removes the wallet from localStorage', () => {
    const account = { publicKey: 'GTEST123', balance: 500 }
    localStorage.setItem('remitflow.wallet', JSON.stringify(account))
    
    disconnectWallet()
    
    expect(getStoredWallet()).toBeNull()
  })
})

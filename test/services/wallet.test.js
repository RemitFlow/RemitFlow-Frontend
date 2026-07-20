import { describe, expect, it } from 'vitest'
import { signTransaction } from '../../src/services/wallet.js'

describe('signTransaction', () => {
  it('resolves with a unique signature, simulating the wallet signing prompt', async () => {
    const result = await signTransaction({ recipient: 'amina@example.com', sendAmount: 15 })
    expect(typeof result.signature).toBe('string')
    expect(result.signature.startsWith('SIGNED_')).toBe(true)
  })

  it('produces a different signature for each call', async () => {
    const first = await signTransaction({ sendAmount: 10 })
    const second = await signTransaction({ sendAmount: 20 })
    expect(first.signature).not.toBe(second.signature)
  })
})

import { useWallet } from '../hooks/useWallet.js'
import { shortenAddress } from '../utils/format.js'
import Button from './Button.jsx'
import Alert from './Alert.jsx'
import './WalletButton.css'

/**
 * Connect / disconnect the mock Stellar wallet.
 */
export default function WalletButton() {
  const { wallet, isConnected, connecting, connectionError, connect, disconnect } = useWallet()

  async function handleConnect() {
    try {
      await connect()
    } catch (err) {
      // Error is already stored in context, just prevent propagation
      console.error('Wallet connection failed:', err)
    }
  }

  if (isConnected) {
    return (
      <div className="wallet-button">
        <span className="wallet-balance">{wallet.balance} XLM</span>
        <span className="wallet-address" title={wallet.publicKey}>
          {shortenAddress(wallet.publicKey)}
        </span>
        <Button variant="secondary" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="wallet-button-wrapper">
      <Button onClick={handleConnect} disabled={connecting}>
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
      {connectionError && (
        <Alert variant="error" style={{ marginTop: '0.5rem' }}>
          {connectionError}
        </Alert>
      )}
    </div>
  )
}

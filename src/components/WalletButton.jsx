import { useWallet } from '../hooks/useWallet.js';
import { shortenAddress } from '../utils/format.js';
import Button from './Button.jsx';
import './WalletButton.css';

/**
 * Connect / disconnect the mock Stellar wallet.
 */
export default function WalletButton() {
  const { wallet, isConnected, connecting, connect, disconnect } = useWallet();

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
    );
  }

  return (
    <Button onClick={connect} disabled={connecting}>
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}

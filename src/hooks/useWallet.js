import { useApp } from '../context/AppContext.jsx';

/**
 * Convenience hook for accessing wallet state and actions.
 * @returns {{wallet: object|null, isConnected: boolean, connecting: boolean,
 *   signing: boolean, connect: Function, disconnect: Function, sign: Function}}
 */
export function useWallet() {
  const {
    wallet,
    isConnected,
    connecting,
    signing,
    connect,
    disconnect,
    sign,
  } = useApp();
  return {
    wallet,
    isConnected,
    connecting,
    signing,
    connect,
    disconnect,
    sign,
  };
}

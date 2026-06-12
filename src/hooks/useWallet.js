import { useApp } from '../context/AppContext.jsx'

/**
 * Convenience hook for accessing wallet state and actions.
 * @returns {{wallet: object|null, isConnected: boolean, connecting: boolean,
 *   connect: Function, disconnect: Function}}
 */
export function useWallet() {
  const { wallet, isConnected, connecting, connect, disconnect } = useApp()
  return { wallet, isConnected, connecting, connect, disconnect }
}

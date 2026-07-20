import { useEffect, useState } from 'react';

function readOnlineStatus() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Track whether the browser currently has a network connection.
 * @returns {boolean} true when online, false once connectivity is lost
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(readOnlineStatus);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

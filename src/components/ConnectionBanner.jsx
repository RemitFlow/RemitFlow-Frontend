import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import './ConnectionBanner.css';

/**
 * Full-width banner shown while the browser reports no network connection.
 * Renders nothing while online.
 */
export default function ConnectionBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="connection-banner" role="status">
      <span className="connection-banner-icon" aria-hidden="true">
        ⚠️
      </span>
      You're offline. Some features may not work until your connection is
      restored.
    </div>
  );
}

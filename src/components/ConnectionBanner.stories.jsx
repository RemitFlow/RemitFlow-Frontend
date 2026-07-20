import { useState } from 'react';
import ConnectionBanner from './ConnectionBanner.jsx';

export default {
  title: 'Components/ConnectionBanner',
  component: ConnectionBanner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Full-width banner shown while the browser reports no network connection. Hidden while online.',
      },
    },
  },
};

export const Online = {
  render: () => <ConnectionBanner />,
};

function OfflineDemo() {
  const [offline, setOffline] = useState(false);

  function toggle() {
    const next = !offline;
    setOffline(next);
    window.dispatchEvent(new Event(next ? 'offline' : 'online'));
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        style={{ marginBottom: '0.75rem' }}
      >
        {offline ? 'Go back online' : 'Simulate going offline'}
      </button>
      <ConnectionBanner />
    </div>
  );
}

export const OfflineSimulation = {
  render: () => <OfflineDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Click the button to simulate the browser losing connectivity and see the banner appear.',
      },
    },
  },
};

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import PullToRefresh from '../../src/components/PullToRefresh.jsx';

describe('PullToRefresh Component & Mobile List Integration', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/transfers');
    localStorage.clear();
  });

  it('renders children correctly and shows manual trigger', () => {
    const onRefresh = vi.fn().mockResolvedValue(true);
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Transfer list item</div>
      </PullToRefresh>,
    );

    expect(screen.getByText('Transfer list item')).toBeInTheDocument();
    expect(screen.getByTestId('ptr-manual-button')).toBeInTheDocument();
  });

  it('triggers onRefresh when manual trigger button is clicked', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(true);
    render(
      <PullToRefresh onRefresh={onRefresh}>
        <div>Transfer list item</div>
      </PullToRefresh>,
    );

    const button = screen.getByTestId('ptr-manual-button');
    await user.click(button);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('handles touch gestures (touchstart, touchmove, touchend) to trigger refresh', async () => {
    const onRefresh = vi.fn().mockResolvedValue(true);
    render(
      <PullToRefresh onRefresh={onRefresh} pullThreshold={50}>
        <div>List item</div>
      </PullToRefresh>,
    );

    const container = screen.getByTestId('pull-to-refresh-container');

    // Touch start at top of list
    fireEvent.touchStart(container, {
      touches: [{ clientY: 100 }],
    });

    // Touch move down past threshold (diff = 200, pulldistance = 100 > 50)
    fireEvent.touchMove(container, {
      touches: [{ clientY: 300 }],
    });

    expect(screen.getByText('Release to refresh')).toBeInTheDocument();

    // Touch end triggers refresh
    fireEvent.touchEnd(container);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('integrates pull-to-refresh on the transfers page', async () => {
    render(<App />);

    // Verify transfers page loaded with pull-to-refresh container
    await screen.findByRole('heading', { name: /your transfers/i });
    expect(screen.getByTestId('pull-to-refresh-container')).toBeInTheDocument();

    const manualBtn = screen.getByTestId('ptr-manual-button');
    fireEvent.click(manualBtn);

    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });
});

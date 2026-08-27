
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../../src/context/AppContext.jsx';
import * as walletService from '../../src/services/wallet.js';

function TestComponent() {
  const {
    wallet,
    isConnected,
    connecting,
    connectionError,
    connect,
    disconnect,
  } = useApp();

  return (
    <div>
      <div data-testid="connected">{isConnected ? 'yes' : 'no'}</div>
      <div data-testid="connecting">{connecting ? 'yes' : 'no'}</div>
      <div data-testid="error">{connectionError || 'none'}</div>
      <div data-testid="wallet-key">{wallet?.publicKey || 'none'}</div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}

describe('AppContext wallet connection handling', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts with no wallet connected', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    expect(screen.getByTestId('connected')).toHaveTextContent('no');
    expect(screen.getByTestId('connecting')).toHaveTextContent('no');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
    expect(screen.getByTestId('wallet-key')).toHaveTextContent('none');
  });

  it('sets connecting state during connection attempt', async () => {
    const mockAccount = { publicKey: 'GTEST123', balance: 1000 };
    vi.spyOn(walletService, 'connectWallet').mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(mockAccount), 100)),
    );

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connecting')).toHaveTextContent('yes');
    });

    await waitFor(() => {
      expect(screen.getByTestId('connecting')).toHaveTextContent('no');
      expect(screen.getByTestId('connected')).toHaveTextContent('yes');
      expect(screen.getByTestId('wallet-key')).toHaveTextContent('GTEST123');
    });
  });

  it('handles successful wallet connection', async () => {
    const mockAccount = { publicKey: 'GTEST456', balance: 500 };
    vi.spyOn(walletService, 'connectWallet').mockResolvedValue(mockAccount);

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('yes');
      expect(screen.getByTestId('wallet-key')).toHaveTextContent('GTEST456');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
    });
  });

  it('handles rejected wallet connection', async () => {
    vi.spyOn(walletService, 'connectWallet').mockRejectedValue(
      new Error('User rejected the connection request'),
    );

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connecting')).toHaveTextContent('no');
      expect(screen.getByTestId('connected')).toHaveTextContent('no');
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Wallet connection was cancelled.',
      );
    });
  });

  it('handles connection timeout', async () => {
    vi.spyOn(walletService, 'connectWallet').mockImplementation(
      () => new Promise(() => {}),
    );

    render(
      <AppProvider connectTimeoutMs={100}>
        <TestComponent />
      </AppProvider>,
    );

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'The request timed out. Please try again.',
      );
    });
  });

  it('clears error when disconnecting', async () => {
    vi.spyOn(walletService, 'connectWallet').mockRejectedValue(
      new Error('Connection failed'),
    );

    const mockAccount = { publicKey: 'GTEST789', balance: 750 };
    vi.spyOn(walletService, 'getStoredWallet').mockReturnValue(mockAccount);

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
    });

    vi.spyOn(walletService, 'connectWallet').mockResolvedValue(mockAccount);
    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('yes');
    });

    screen.getByText('Disconnect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('no');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
    });
  });

  it('clears previous error on new connection attempt', async () => {
    vi.spyOn(walletService, 'connectWallet')
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({ publicKey: 'GTEST999', balance: 200 });

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Something went wrong. Please try again.',
      );
    });

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('yes');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
    });
  });

  it('restores previously connected wallet on mount', async () => {
    const storedAccount = { publicKey: 'GSTORED123', balance: 300 };
    vi.spyOn(walletService, 'getStoredWallet').mockReturnValue(storedAccount);

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('yes');
      expect(screen.getByTestId('wallet-key')).toHaveTextContent('GSTORED123');
    });
  });

  it('handles disconnect correctly', async () => {
    const mockAccount = { publicKey: 'GTEST555', balance: 600 };
    vi.spyOn(walletService, 'connectWallet').mockResolvedValue(mockAccount);
    vi.spyOn(walletService, 'disconnectWallet').mockImplementation(() => {});

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>,
    );

    screen.getByText('Connect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('yes');
    });

    screen.getByText('Disconnect').click();

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('no');
      expect(screen.getByTestId('wallet-key')).toHaveTextContent('none');
    });
    expect(walletService.disconnectWallet).toHaveBeenCalled();
  });
});

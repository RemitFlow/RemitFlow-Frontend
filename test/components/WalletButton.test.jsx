
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletButton from '../../src/components/WalletButton.jsx';
import { AppProvider } from '../../src/context/AppContext.jsx';
import * as walletService from '../../src/services/wallet.js';

function renderWithProvider(component, connectTimeoutMs = 30000) {
  return render(
    <AppProvider connectTimeoutMs={connectTimeoutMs}>{component}</AppProvider>,
  );
}

describe('WalletButton', () => {
  it('renders connect button when wallet is not connected', () => {
    renderWithProvider(<WalletButton />);
    expect(
      screen.getByRole('button', { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });

  it('shows connecting state during connection attempt', async () => {
    vi.spyOn(walletService, 'connectWallet').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ publicKey: 'GTEST', balance: 1000 }), 100),
        ),
    );

    renderWithProvider(<WalletButton />);
    const button = screen.getByRole('button', { name: /connect wallet/i });

    await userEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /connecting/i }),
      ).toBeDisabled();
    });
  });

  it('displays wallet info when connected', async () => {
    vi.spyOn(walletService, 'connectWallet').mockResolvedValue({
      publicKey: 'GA7Y253GXX7G4L5BJSJ36QL532454532532454532532454532532454',
      balance: 5000,
    });

    renderWithProvider(<WalletButton />);
    const button = screen.getByRole('button', { name: /connect wallet/i });

    await userEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('GA7Y25...2454')).toBeInTheDocument();
      expect(screen.getByText(/5000/)).toBeInTheDocument();
    });
  });

  it('displays a safe error alert when connection is rejected', async () => {
    vi.spyOn(walletService, 'connectWallet').mockRejectedValue(
      new Error('User cancelled connection'),
    );

    renderWithProvider(<WalletButton />);
    const button = screen.getByRole('button', { name: /connect wallet/i });

    await userEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/wallet connection was cancelled/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /connect wallet/i }),
    ).not.toBeDisabled();
  });

  it('displays a safe error alert on connection timeout', async () => {
    vi.spyOn(walletService, 'connectWallet').mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithProvider(<WalletButton />, 100);

    await userEvent.click(
      screen.getByRole('button', { name: /connect wallet/i }),
    );

    await waitFor(
      () => {
        expect(screen.getByText(/the request timed out/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('clears safe error on successful retry after failed connection', async () => {
    const mockAccount = { publicKey: 'GTEST123', balance: 500 };
    vi.spyOn(walletService, 'connectWallet')
      .mockRejectedValueOnce(new Error('Connection failed'))
      .mockResolvedValueOnce(mockAccount);

    renderWithProvider(<WalletButton />);

    await userEvent.click(
      screen.getByRole('button', { name: /connect wallet/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole('button', { name: /connect wallet/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText(/500 XLM/)).toBeInTheDocument();
    });
  });

  it('handles disconnect correctly', async () => {
    const mockAccount = { publicKey: 'GTEST456', balance: 750 };
    vi.spyOn(walletService, 'connectWallet').mockResolvedValue(mockAccount);
    vi.spyOn(walletService, 'disconnectWallet').mockImplementation(() => {});

    renderWithProvider(<WalletButton />);

    await userEvent.click(
      screen.getByRole('button', { name: /connect wallet/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /disconnect/i }),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /disconnect/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /connect wallet/i }),
      ).toBeInTheDocument();
    });
  });

  it('does not allow clicking connect button while connecting', async () => {
    vi.spyOn(walletService, 'connectWallet').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ publicKey: 'GTEST', balance: 1000 }), 200),
        ),
    );

    renderWithProvider(<WalletButton />);
    const button = screen.getByRole('button', { name: /connect wallet/i });

    await userEvent.click(button);

    await waitFor(() => {
      const connectingButton = screen.getByRole('button', {
        name: /connecting/i,
      });
      expect(connectingButton).toBeDisabled();
    });
  });
});

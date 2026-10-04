import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';
import * as walletService from '../../src/services/wallet.js';
import { QUOTE_TTL_MS } from '../../src/services/contracts/quote.js';

async function fillValidForm(user) {
  await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
  await user.type(screen.getByLabelText(/amount/i), '15');
  await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
}

describe('Send money quote freshness', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send');
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-24T19:00:00Z'));
    // Quote scenarios connect successfully unless a rejection case overrides this.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows quote source, expiry, and currency metadata', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await fillValidForm(user);

    const card = await screen.findByText(/transfer summary/i);
    const quoteCard = card.closest('.quote-card');
    expect(quoteCard).not.toBeNull();
    expect(within(quoteCard).getByText(/^source$/i)).toBeInTheDocument();
    expect(within(quoteCard).getByText(/fx\.table/i)).toBeInTheDocument();
    expect(within(quoteCard).getByText(/^expires$/i)).toBeInTheDocument();
    expect(within(quoteCard).getByText(/^currencies$/i)).toBeInTheDocument();
    expect(within(quoteCard).getByText(/^quote id$/i)).toBeInTheDocument();
    expect(quoteCard).toHaveAttribute('data-quote-id');
  });

  it('blocks confirm after the quote expires and offers refresh', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const createSpy = vi.spyOn(api, 'createTransfer').mockResolvedValue({
      id: 'tx_fresh',
      recipient: 'amina@example.com',
      from: 'USD',
      to: 'NGN',
      sendAmount: '15.00',
      receiveAmount: '22000.00',
      status: 'pending',
      createdAt: '2026-09-24T19:00:00Z',
      quoteId: 'qt_test',
    });

    render(<App />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });

    await act(async () => {
      vi.advanceTimersByTime(QUOTE_TTL_MS + 50);
    });

    expect(
      within(dialog).getByText(/this quote has expired/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    ).toBeDisabled();

    await user.click(
      within(dialog).getByRole('button', { name: /refresh quote/i }),
    );
    expect(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    ).not.toBeDisabled();

    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );

    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    expect(createSpy).toHaveBeenCalled();
    expect(createSpy.mock.calls[0][0].quoteId).toMatch(/^qt_/);
  });

  it('keeps a localized amount signable after keyboard review', async () => {
    localStorage.setItem('remitflow:locale', JSON.stringify('fr-FR'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
    await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
    await user.type(screen.getByLabelText(/amount/i), '15,00');
    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    const card = within(dialog)
      .getByText(/transfer summary/i)
      .closest('.quote-card');
    const quoteId = card.getAttribute('data-quote-id');
    expect(quoteId).toMatch(/^qt_/);
    expect(within(dialog).getByTestId('quote-send-amount')).toHaveTextContent(
      '15,00',
    );

    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );

    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    const transfer = stored.find((entry) => entry.quoteId === quoteId);
    expect(transfer).toMatchObject({
      recipient: 'amina@example.com',
      sendAmount: '15',
      from: 'USD',
      to: 'NGN',
    });
  });

  it('preserves Portuguese decimal input through blur and confirmation', async () => {
    localStorage.setItem('remitflow:locale', JSON.stringify('pt-BR'));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
    await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
    const amountField = screen.getByLabelText(/amount/i);
    await user.type(amountField, '15,00');
    await user.tab();
    expect(amountField).toHaveValue('15,00');

    // Repeated focus changes must leave the same value signable.
    await user.click(amountField);
    await user.tab();
    expect(amountField).toHaveValue('15,00');
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    expect(within(dialog).getByTestId('quote-send-amount')).toHaveTextContent(
      '15,00',
    );

    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );
    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
    const transfer = stored.find((entry) => entry.quoteId);
    expect(transfer.sendAmount).toBe('15');
  });

  it.each([
    {
      label: 'integer balance',
      amount: '15,00',
      balance: 100,
      canonical: '15',
    },
    {
      label: 'exact fractional balance',
      amount: '25,50',
      balance: 25.5,
      canonical: '25.5',
    },
    {
      label: 'canonical string balance',
      amount: '15,00',
      balance: '100.00',
      canonical: '15',
    },
  ])(
    'compares localized input against a connected $label',
    async ({ amount, balance, canonical }) => {
      localStorage.setItem('remitflow.transfers', JSON.stringify([]));
      localStorage.setItem('remitflow:locale', JSON.stringify('pt-BR'));
      localStorage.setItem(
        'remitflow.wallet',
        JSON.stringify({
          publicKey: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
          balance,
        }),
      );
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
      await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
      const amountField = screen.getByLabelText(/amount/i);
      await user.type(amountField, amount);
      await user.tab();
      expect(amountField).toHaveValue(amount);
      await user.click(screen.getByRole('button', { name: /review & send/i }));

      const dialog = await screen.findByRole('dialog', {
        name: /confirm your transfer/i,
      });
      expect(within(dialog).getByTestId('quote-send-amount')).toHaveTextContent(
        amount,
      );
      const quoteId = within(dialog)
        .getByText(/transfer summary/i)
        .closest('.quote-card')
        .getAttribute('data-quote-id');
      expect(quoteId).toMatch(/^qt_/);

      await user.click(
        within(dialog).getByRole('button', { name: /confirm transfer/i }),
      );
      await screen.findByRole(
        'dialog',
        { name: /transfer submitted/i },
        { timeout: 5000 },
      );
      const stored = JSON.parse(localStorage.getItem('remitflow.transfers'));
      const matching = stored.filter((entry) => entry.quoteId === quoteId);
      expect(matching).toHaveLength(1);
      expect(matching[0]).toMatchObject({
        recipient: 'amina@example.com',
        sendAmount: canonical,
        from: 'USD',
        to: 'NGN',
      });
    },
  );

  it.each([
    { amount: '100,01', balance: 100 },
    { amount: '25,51', balance: 25.5 },
  ])(
    'rejects localized $amount above connected balance $balance',
    async ({ amount, balance }) => {
      localStorage.setItem('remitflow:locale', JSON.stringify('pt-BR'));
      localStorage.setItem(
        'remitflow.wallet',
        JSON.stringify({
          publicKey: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
          balance,
        }),
      );
      const createSpy = vi.spyOn(api, 'createTransfer');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
      await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
      await user.type(screen.getByLabelText(/amount/i), amount);
      await user.click(screen.getByRole('button', { name: /review & send/i }));

      expect(
        await screen.findByText('Amount exceeds your wallet balance.'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('dialog', { name: /confirm your transfer/i }),
      ).not.toBeInTheDocument();
      expect(createSpy).not.toHaveBeenCalled();
      expect(localStorage.getItem('remitflow.transfers')).toBeNull();
    },
  );

  it.each([
    {
      label: 'rejected connection',
      amount: '15,00',
      random: 0,
      message:
        'Wallet connection did not complete. Connect your wallet and try again.',
    },
    {
      label: 'newly connected insufficient balance',
      amount: '1000,01',
      random: 0.5,
      message: 'Amount exceeds your wallet balance.',
    },
  ])('stops a transfer after a $label', async ({ amount, random, message }) => {
    localStorage.setItem('remitflow:locale', JSON.stringify('pt-BR'));
    localStorage.setItem('remitflow.transfers', JSON.stringify([]));
    vi.spyOn(Math, 'random').mockReturnValue(random);
    const createSpy = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
    await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
    await user.type(screen.getByLabelText(/amount/i), amount);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );

    expect(
      await screen.findByText(message, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: /transfer submitted/i }),
    ).not.toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('remitflow.transfers'))).toEqual([]);
    expect(
      screen.getByRole('button', { name: /review & send/i }),
    ).not.toBeDisabled();
  });

  it.each([
    { amount: '15,00', canonical: '15' },
    { amount: '1000,00', canonical: '1000' },
  ])(
    'checks the returned wallet before saving affordable $amount',
    async ({ amount, canonical }) => {
      localStorage.setItem('remitflow:locale', JSON.stringify('pt-BR'));
      localStorage.setItem('remitflow.transfers', JSON.stringify([]));
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
      await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
      await user.type(screen.getByLabelText(/amount/i), amount);
      await user.click(screen.getByRole('button', { name: /review & send/i }));
      const dialog = await screen.findByRole('dialog', {
        name: /confirm your transfer/i,
      });
      const quoteId = within(dialog)
        .getByText(/transfer summary/i)
        .closest('.quote-card')
        .getAttribute('data-quote-id');
      await user.click(
        within(dialog).getByRole('button', { name: /confirm transfer/i }),
      );
      await screen.findByRole(
        'dialog',
        { name: /transfer submitted/i },
        { timeout: 5000 },
      );

      expect(JSON.parse(localStorage.getItem('remitflow.wallet')).balance).toBe(
        1000,
      );
      expect(JSON.parse(localStorage.getItem('remitflow.transfers'))).toEqual([
        expect.objectContaining({ quoteId, sendAmount: canonical }),
      ]);
    },
  );

  it.each([
    { label: 'the network drops', reconnectBeforeWallet: false },
    { label: 'the network drops and recovers', reconnectBeforeWallet: true },
  ])(
    'does not resume confirmation when $label during wallet connection',
    async ({ reconnectBeforeWallet }) => {
      localStorage.setItem('remitflow.transfers', JSON.stringify([]));
      const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      let resolveConnection;
      const connection = new Promise((resolve) => {
        resolveConnection = resolve;
      });
      vi.spyOn(walletService, 'connectWallet').mockReturnValue(connection);
      const createSpy = vi.spyOn(api, 'createTransfer');
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /review & send/i }));
      const dialog = await screen.findByRole('dialog', {
        name: /confirm your transfer/i,
      });
      const originalQuoteId = within(dialog)
        .getByText(/transfer summary/i)
        .closest('.quote-card')
        .getAttribute('data-quote-id');
      await user.click(
        within(dialog).getByRole('button', { name: /confirm transfer/i }),
      );

      act(() => {
        online.mockReturnValue(false);
        window.dispatchEvent(new Event('offline'));
      });
      expect(
        screen.queryByRole('dialog', { name: /confirm your transfer/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/the pending quote was cleared/i),
      ).toBeInTheDocument();

      if (reconnectBeforeWallet) {
        act(() => {
          online.mockReturnValue(true);
          window.dispatchEvent(new Event('online'));
        });
      }

      await act(async () => {
        resolveConnection({
          publicKey: 'GBQAZ7Z3X7DEMOPUBLICKEY4REMITFLOWWALLET123456789ABCDEF',
          balance: 1000,
        });
        await connection;
      });
      await act(async () => {
        vi.advanceTimersByTime(700);
      });

      expect(createSpy).not.toHaveBeenCalled();
      expect(JSON.parse(localStorage.getItem('remitflow.transfers'))).toEqual(
        [],
      );
      expect(
        screen.queryByRole('dialog', { name: /transfer submitted/i }),
      ).not.toBeInTheDocument();

      if (!reconnectBeforeWallet) {
        act(() => {
          online.mockReturnValue(true);
          window.dispatchEvent(new Event('online'));
        });
      }
      const reviewButton = screen.getByRole('button', {
        name: /review & send/i,
      });
      expect(reviewButton).toBeEnabled();
      await user.click(reviewButton);
      const retryDialog = await screen.findByRole('dialog', {
        name: /confirm your transfer/i,
      });
      const retryQuoteId = within(retryDialog)
        .getByText(/transfer summary/i)
        .closest('.quote-card')
        .getAttribute('data-quote-id');
      expect(retryQuoteId).not.toBe(originalQuoteId);
      await user.click(
        within(retryDialog).getByRole('button', { name: /confirm transfer/i }),
      );
      await screen.findByRole(
        'dialog',
        { name: /transfer submitted/i },
        { timeout: 5000 },
      );
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(localStorage.getItem('remitflow.transfers'))).toEqual([
        expect.objectContaining({ quoteId: retryQuoteId, sendAmount: '15' }),
      ]);
    },
  );

  it('binds the quote id into the createTransfer payload', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const createSpy = vi
      .spyOn(api, 'createTransfer')
      .mockImplementation(async (payload) => ({
        id: 'tx_bound',
        status: 'pending',
        createdAt: '2026-09-24T19:00:00Z',
        ...payload,
      }));

    render(<App />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );

    await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    const payload = createSpy.mock.calls[0][0];
    expect(payload.quoteId).toMatch(/^qt_/);
    expect(payload.sendAmount).toBeDefined();
    expect(payload.from).toBe('USD');
    expect(payload.to).toBe('NGN');
  });
});

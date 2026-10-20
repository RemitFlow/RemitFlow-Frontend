
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';

// Quote metadata surfaced by the send flow. Tests pin a deterministic quote so
// expiry, currency and precision assertions do not depend on wall-clock time.
function quoteFixture(overrides = {}) {
  return {
    id: 'quote_test_1',
    source: 'test-fx-provider',
    fromCurrency: 'USD',
    toCurrency: 'NGN',
    amount: '15',
    canonicalAmount: '15.00',
    rate: '1500.00',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function mockQuote(overrides) {
  return vi.spyOn(api, 'getQuote').mockResolvedValue(quoteFixture(overrides));
}

async function fillValidForm(user) {
  await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
  await user.type(screen.getByLabelText(/amount/i), '15');
  await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
}

function createdTransfer(payload) {
  return {
    id: 'tx_test',
    status: 'pending',
    createdAt: '2026-07-20T00:00:00Z',
    ...payload,
  };
}

// Open the quote confirmation dialog and submit the transfer from it.
async function reviewAndConfirm(user) {
  await user.click(screen.getByRole('button', { name: /review & send/i }));
  const dialog = await screen.findByRole('dialog', {
    name: /confirm your transfer/i,
  });
  await user.click(
    within(dialog).getByRole('button', { name: /confirm transfer/i }),
  );
  // Wallet connect + transfer creation are mocked with real delays.
  return screen.findByRole(
    'dialog',
    { name: /transfer submitted/i },
    {
      timeout: 5000,
    },
  );
}

async function finishOnTransfersPage(user, resultDialog) {
  await user.click(
    within(resultDialog).getByRole('button', { name: /view transfers/i }),
  );
  await screen.findByRole(
    'heading',
    { name: /your transfers/i },
    { timeout: 5000 },
  );
}

describe('Send money form flows', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows validation feedback before allowing submission', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /review & send/i }));

    expect(
      await screen.findByText(/enter a valid email or stellar address/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter an amount greater than zero/i),
    ).toBeInTheDocument();
    // Invalid submissions must not open the confirmation dialog.
    expect(
      screen.queryByRole('dialog', { name: /confirm your transfer/i }),
    ).not.toBeInTheDocument();
  });

  it('submits a transfer and shows it on the transfers page', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    const resultDialog = await reviewAndConfirm(user);
    await finishOnTransfersPage(user, resultDialog);

    await waitFor(() => {
      expect(screen.getByText('$15.00')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
  });

  it('disables the confirm button while wallet connection is pending', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    expect(createTransfer).not.toHaveBeenCalled();

    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    await finishOnTransfersPage(user, resultDialog);
  });

  it('creates one transfer after two rapid confirm-button clicks', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    const confirmButton = within(dialog).getByRole('button', {
      name: /confirm transfer/i,
    });
    act(() => {
      confirmButton.click();
      confirmButton.click();
    });

    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    expect(createTransfer).toHaveBeenCalledTimes(1);
    await finishOnTransfersPage(user, resultDialog);
  });

  it('creates one transfer after two synchronous native submit events', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    const form = screen
      .getByRole('button', { name: /review & send/i })
      .closest('form');
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    // A repeated review request must not stack a second confirmation dialog.
    const dialogs = screen.getAllByRole('dialog', {
      name: /confirm your transfer/i,
    });
    expect(dialogs).toHaveLength(1);

    await user.click(
      within(dialogs[0]).getByRole('button', { name: /confirm transfer/i }),
    );
    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    expect(createTransfer).toHaveBeenCalledTimes(1);
    await finishOnTransfersPage(user, resultDialog);
  });

  it('releases the submission lock after a safe failure and permits a retry', async () => {
    const createTransfer = vi
      .spyOn(api, 'createTransfer')
      .mockRejectedValueOnce(new Error('transfer failed'))
      .mockImplementationOnce(async (payload) => createdTransfer(payload));
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /review & send/i });
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);

    // Re-review, then confirm again through the dialog.
    const retryDialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(retryDialog).getByRole('button', { name: /confirm transfer/i }),
    );

    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    await finishOnTransfersPage(user, resultDialog);
    expect(createTransfer).toHaveBeenCalledTimes(2);
  });

  it('blocks confirmation when the quote has expired and explains why', async () => {
    mockQuote({ expiresAt: new Date(Date.now() - 60 * 1000).toISOString() });
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    expect(await screen.findByText(/quote (has )?expired/i)).toBeInTheDocument();
    const dialog = screen.queryByRole('dialog', {
      name: /confirm your transfer/i,
    });
    if (dialog) {
      const confirm = within(dialog).queryByRole('button', {
        name: /confirm transfer/i,
      });
      if (confirm) {
        expect(confirm).toBeDisabled();
        await user.click(confirm);
      }
    }
    expect(createTransfer).not.toHaveBeenCalled();
  });

  it('invalidates the quote when inputs change after review', async () => {
    const getQuote = mockQuote();
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    expect(getQuote).toHaveBeenCalledTimes(1);

    // Changing the amount after review must discard the stale quote.
    await user.clear(screen.getByLabelText(/amount/i));
    await user.type(screen.getByLabelText(/amount/i), '25');

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /confirm your transfer/i }),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const freshDialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    expect(getQuote).toHaveBeenCalledTimes(2);
    await user.click(
      within(freshDialog).getByRole('button', { name: /confirm transfer/i }),
    );
    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    await finishOnTransfersPage(user, resultDialog);
    expect(createTransfer).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['USD', 'INR', '15', '15.00'],
    ['EUR', 'NGN', '15', '15.00'],
  ])(
    'confirms a %s->%s transfer and binds the active quoteId to the payload',
    async (fromCurrency, toCurrency, amount, canonicalAmount) => {
      const getQuote = mockQuote({
        fromCurrency,
        toCurrency,
        amount,
        canonicalAmount,
      });
      const createTransfer = vi
        .spyOn(api, 'createTransfer')
        .mockImplementation(async (payload) => createdTransfer(payload));
      const user = userEvent.setup();
      render(<App />);

      await user.selectOptions(
        screen.getByLabelText(/^from$/i),
        fromCurrency,
      );
      await user.type(
        screen.getByLabelText(/recipient/i),
        'amina@example.com',
      );
      await user.type(screen.getByLabelText(/amount/i), amount);
      await user.selectOptions(screen.getByLabelText(/^to$/i), toCurrency);

      await user.click(screen.getByRole('button', { name: /review & send/i }));
      const dialog = await screen.findByRole('dialog', {
        name: /confirm your transfer/i,
      });
      // The canonical quoted amount is what the user reviews.
      expect(within(dialog).getByText(canonicalAmount)).toBeInTheDocument();
      await user.click(
        within(dialog).getByRole('button', { name: /confirm transfer/i }),
      );

      const resultDialog = await screen.findByRole(
        'dialog',
        { name: /transfer submitted/i },
        { timeout: 5000 },
      );
      await finishOnTransfersPage(user, resultDialog);

      expect(getQuote).toHaveBeenCalled();
      expect(createTransfer).toHaveBeenCalledTimes(1);
      const payload = createTransfer.mock.calls[0][0];
      expect(payload.quoteId).toBe('quote_test_1');
      expect(payload.amount).toBe(canonicalAmount);
      expect(payload.fromCurrency).toBe(fromCurrency);
      expect(payload.toCurrency).toBe(toCurrency);
    },
  );

  it('shows the canonical quoted amount that is later serialized', async () => {
    mockQuote({ amount: '15', canonicalAmount: '15.00' });
    const createTransfer = vi
      .spyOn(api, 'createTransfer')
      .mockImplementation(async (payload) => createdTransfer(payload));
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    expect(within(dialog).getByText('15.00')).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );

    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    await finishOnTransfersPage(user, resultDialog);

    const payload = createTransfer.mock.calls[0][0];
    expect(payload.amount).toBe('15.00');
  });

  it('allows a valid submission after an invalid submission', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /review & send/i }));
    expect(
      await screen.findByText(/enter a valid email or stellar address/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /review & send/i }),
    ).toBeEnabled();

    await fillValidForm(user);
    const resultDialog = await reviewAndConfirm(user);
    await finishOnTransfersPage(user, resultDialog);
    expect(createTransfer).toHaveBeenCalledTimes(1);
  });
});

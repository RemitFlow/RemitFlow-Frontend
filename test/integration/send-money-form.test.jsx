
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

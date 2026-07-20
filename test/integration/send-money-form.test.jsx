import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';

async function fillValidForm(user) {
  await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
  await user.type(screen.getByLabelText(/amount/i), '15');
  await user.selectOptions(screen.getByLabelText(/to/i), 'NGN');
}

function createdTransfer(payload) {
  return {
    id: 'tx_test',
    status: 'pending',
    createdAt: '2026-07-20T00:00:00Z',
    ...payload,
  };
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
  });

  it('submits a transfer and shows it on the transfers page', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
    await waitFor(() => {
      expect(screen.getByText('$15.00')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
  });

  it('disables the submit button while wallet connection is pending', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    expect(createTransfer).not.toHaveBeenCalled();

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
  });

  it('creates one transfer after two rapid submit-button clicks', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    const submitButton = screen.getByRole('button', { name: /review & send/i });
    act(() => {
      submitButton.click();
      submitButton.click();
    });

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
    expect(createTransfer).toHaveBeenCalledTimes(1);
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

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
    expect(createTransfer).toHaveBeenCalledTimes(1);
  });

  it('releases the submission lock after failure and permits a retry', async () => {
    const createTransfer = vi
      .spyOn(api, 'createTransfer')
      .mockRejectedValueOnce(new Error('transfer failed'))
      .mockImplementationOnce(async (payload) => createdTransfer(payload));
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    expect(
      await screen.findByText(/could not submit the transfer/i),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /review & send/i });
    expect(retryButton).toBeEnabled();

    await user.click(retryButton);

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
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
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
    expect(createTransfer).toHaveBeenCalledTimes(1);
  });
});

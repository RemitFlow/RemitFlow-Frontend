import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';

/**
 * Toggle the browser's simulated connectivity. jsdom starts online, so flip
 * navigator.onLine and dispatch the matching window event — the same signals
 * the app's useOnlineStatus hook listens for.
 */
function goOffline() {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: false,
  });
  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}

function goOnline() {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

async function fillValidForm(user) {
  await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
  await user.type(screen.getByLabelText(/amount/i), '15');
  await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');
}

describe('Offline and reconnect state for transfer mutations', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    window.history.pushState({}, '', '/send');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not create a transfer when submitting while offline', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    goOffline();

    // The button is disabled and labelled "Offline — Reconnect to send" while offline.
    const submitButton = screen.getByRole('button', {
      name: /reconnect to send/i,
    });
    expect(submitButton).toBeDisabled();

    expect(
      screen.getByText(/no internet connection\. send money is disabled/i),
    ).toBeInTheDocument();

    // A synthetic click on a disabled button must not start a transfer.
    fireEvent.click(submitButton);
    expect(createTransfer).not.toHaveBeenCalled();
  });

  it('shows the ConnectionBanner while offline', async () => {
    render(<App />);

    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();

    goOffline();

    expect(
      await screen.findByText(
        /you're offline\. some features may not work/i,
      ),
    ).toBeInTheDocument();
  });

  it('blocks submission via submit handler even if the button were not disabled', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    goOffline();

    // Force a submit event on the form itself, bypassing the button's disabled attribute.
    const form = screen.getByLabelText(/recipient/i).closest('form');
    fireEvent.submit(form);

    expect(createTransfer).not.toHaveBeenCalled();
    expect(
      screen.getByText(/you're offline\. connect to the internet/i),
    ).toBeInTheDocument();
  });

  it('re-enables submission after coming back online', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);
    goOffline();

    expect(
      screen.getByRole('button', { name: /reconnect to send/i }),
    ).toBeDisabled();

    goOnline();

    // After reconnecting, the button should change back to "Review & Send" and be enabled.
    const submitButton = await screen.findByRole('button', {
      name: /review & send/i,
    }, { timeout: 5000 });
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    await screen.findByRole('heading', { name: /your transfers/i }, { timeout: 10000 });
    expect(createTransfer).toHaveBeenCalledTimes(1);
  });

  it('does not auto-resubmit the form on reconnect (no duplicate transfer)', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    render(<App />);

    goOffline();

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
    await user.type(screen.getByLabelText(/amount/i), '15');

    goOnline();

    // Coming back online must NOT resubmit the form automatically.
    expect(createTransfer).not.toHaveBeenCalled();
    expect(
      screen.getByText(/back online\. your form was not submitted/i),
    ).toBeInTheDocument();
  });

  it('shows an honest unknown-status message when a transfer fails mid-flight during a disconnect', async () => {
    // Simulate a transfer that the backend accepted but whose response was
    // lost to a mid-flight disconnect: mock createTransfer to go offline
    // before rejecting, so the catch block reads the real-time offline state.
    const createTransfer = vi
      .spyOn(api, 'createTransfer')
      .mockImplementation(async () => {
        // Drop the connection before the rejection — the same thread that
        // would handle the response swallows the connection.
        Object.defineProperty(navigator, 'onLine', {
          configurable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
        throw new Error('network lost');
      });
    const user = userEvent.setup();
    render(<App />);

    await fillValidForm(user);

    // Start the submission.
    const submitButton = screen.getByRole('button', { name: /review & send/i });
    fireEvent.click(submitButton);

    // After the catch block runs, the error message should be about
    // connection loss, NOT a generic "could not submit" message.
    await waitFor(() => {
      expect(
        screen.getByText(/connection lost while sending/i),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/could not submit the transfer\./i),
    ).not.toBeInTheDocument();
  });
});
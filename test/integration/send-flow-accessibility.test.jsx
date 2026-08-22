import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../src/App.jsx';

/**
 * Keyboard-only acceptance tests for the complete Send Money flow.
 * No pointer events are used anywhere: every step is performed with
 * focus(), typing and key presses only, mirroring how a keyboard or
 * switch-device user operates the app.
 */
describe('Send Money flow without a pointer', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send');
    localStorage.clear();
  });

  async function fillFormWithKeyboard(user) {
    const recipient = screen.getByLabelText(/recipient/i);
    recipient.focus();
    await user.keyboard('amina@example.com');

    // Tab moves to the amount field next in DOM/tab order.
    await user.keyboard('{Tab}');
    expect(document.activeElement).toBe(screen.getByLabelText(/amount/i));
    await user.keyboard('15');
    // Default USD -> EUR pair differs, so currency edits aren't needed here.
  }

  it('reviews, confirms and reaches the result using only the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole('heading', { name: /send money/i });
    await fillFormWithKeyboard(user);

    // Enter anywhere in the form submits it, opening the review dialog.
    await user.keyboard('{Enter}');
    const confirmDialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
      timeout: 5000,
    });

    // Focus moves into the dialog so screen readers announce its title.
    await waitFor(() => {
      expect(confirmDialog).toHaveFocus();
    });

    // The quote breakdown is part of the review content.
    expect(
      within(confirmDialog).getByText(/transfer summary/i),
    ).toBeInTheDocument();
    expect(within(confirmDialog).getByText('$15.00')).toBeInTheDocument();

    // Tab cycles within the dialog: close button -> Back -> Confirm.
    await user.keyboard('{Tab}');
    expect(document.activeElement).toHaveAttribute(
      'aria-label',
      'Close dialog',
    );
    await user.keyboard('{Tab}');
    expect(document.activeElement.textContent).toBe('Back');
    await user.keyboard('{Tab}');
    expect(document.activeElement.textContent).toBe('Confirm transfer');

    // Activate confirmation with Enter and observe the announced progress.
    await user.keyboard('{Enter}');
    expect(
      await screen.findByText(
        /submitting your transfer/i,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();

    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );

    // Success is announced via a polite live region inside the dialog.
    const announcement = within(resultDialog).getByText(
      /your transfer was submitted successfully/i,
    );
    expect(announcement).toHaveAttribute('role', 'status');
    await waitFor(() => {
      expect(resultDialog).toHaveFocus();
    });

    // Result summary is readable without a pointer too.
    expect(
      within(resultDialog).getByText(/amina@example\.com/i),
    ).toBeInTheDocument();

    // Tab to "View transfers" and activate it to finish the journey.
    await user.keyboard('{Tab}');
    expect(document.activeElement).toHaveAttribute(
      'aria-label',
      'Close dialog',
    );
    await user.keyboard('{Tab}'); // Close
    await user.keyboard('{Tab}'); // View transfers
    expect(document.activeElement.textContent).toBe('View transfers');
    await user.keyboard('{Enter}');

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
  });

  it('closes the review dialog with Escape and returns focus to the form', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillFormWithKeyboard(user);
    await user.keyboard('{Enter}');

    const confirmDialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await waitFor(() => {
      expect(confirmDialog).toHaveFocus();
    });

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Regression: dismissing the dialog must hand focus back to the control
    // that invoked it — here the amount field the user submitted from —
    // never dropping it on <body>.
    const amountField = screen.getByLabelText(/amount/i);
    expect(document.activeElement).toBe(amountField);

    // The flow remains operable afterwards.
    await user.keyboard('{Enter}');
    expect(
      await screen.findByRole('dialog', { name: /confirm your transfer/i }),
    ).toBeInTheDocument();
  });

  it('associates and announces validation errors on a keyboard-only submit', async () => {
    const user = userEvent.setup();
    render(<App />);

    const recipient = screen.getByLabelText(/recipient/i);
    recipient.focus();
    await user.keyboard('{Enter}');

    // Focus jumps to the first invalid field…
    await waitFor(() => {
      expect(recipient).toHaveFocus();
    });
    expect(recipient).toHaveAttribute('aria-invalid', 'true');
    expect(recipient).toHaveAttribute('aria-describedby', 'recipient-error');

    // …and every aria-describedby target actually exists with alert semantics.
    const describedBy = recipient.getAttribute('aria-describedby');
    const errorNode = document.getElementById(describedBy);
    expect(errorNode).not.toBeNull();
    expect(errorNode).toHaveAttribute('role', 'alert');
    expect(errorNode.textContent).toMatch(/valid email or stellar address/i);

    const amountInput = screen.getByLabelText(/amount/i);
    expect(amountInput).toHaveAttribute('aria-invalid', 'true');
    const amountError = document.getElementById(
      amountInput.getAttribute('aria-describedby'),
    );
    expect(amountError).not.toBeNull();
    expect(amountError.textContent).toMatch(/greater than zero/i);

    // An assertive summary announces the failure count.
    const summary = screen.getByText(
      /form submission failed with 2 validation errors/i,
    );
    expect(summary).toHaveAttribute('aria-live', 'assertive');

    // No dialog should have opened for an invalid submission.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

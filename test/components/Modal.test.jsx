import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import Modal from '../../src/components/Modal.jsx';

function DialogHarness({ onClose }) {
  const [open, setOpen] = useState(false);
  const close = onClose ?? (() => setOpen(false));
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal open={open} onClose={close} title="Example dialog">
        <p>Dialog body</p>
        <button type="button">First action</button>
        <button type="button">Second action</button>
      </Modal>
    </div>
  );
}

async function openDialog(user) {
  await user.click(screen.getByRole('button', { name: /open dialog/i }));
  return screen.findByRole('dialog');
}

describe('Modal accessibility and focus management', () => {
  it('exposes a modal dialog labelled by its visible title', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const dialog = await openDialog(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // The accessible name comes from the visible heading via aria-labelledby.
    const title = screen.getByRole('heading', { name: 'Example dialog' });
    expect(dialog).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
  });

  it('moves focus into the dialog when it opens', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const dialog = await openDialog(user);
    await waitFor(() => {
      expect(dialog).toHaveFocus();
    });
  });

  it('keeps Tab cycling inside the dialog (focus trap)', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const dialog = await openDialog(user);
    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    const firstAction = screen.getByRole('button', { name: /first action/i });
    const secondAction = screen.getByRole('button', { name: /second action/i });

    // From the panel, Tab enters the dialog's focus cycle.
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
    await user.tab();
    expect(document.activeElement).toBe(firstAction);
    await user.tab();
    expect(document.activeElement).toBe(secondAction);

    // Past the last control, focus wraps back to the first.
    await user.tab();
    expect(document.activeElement).not.toBe(secondAction);
    expect(
      [dialog, closeButton, firstAction].includes(document.activeElement),
    ).toBe(true);
  });

  it('wraps Shift+Tab backwards from the first control to the last', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const dialog = await openDialog(user);
    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    const secondAction = screen.getByRole('button', { name: /second action/i });

    await user.tab(); // panel -> close button (first stop)
    expect(document.activeElement).toBe(closeButton);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(secondAction);
  });

  it('returns focus to the invoking element when Escape closes the dialog', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: /open dialog/i });
    await user.click(trigger);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Regression: focus must not be lost to <body> when the dialog closes.
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the invoking element on programmatic close', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: /open dialog/i });
    await user.click(trigger);
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when the overlay outside the panel is clicked', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await openDialog(user);
    // Clicks inside the body must not dismiss it…
    await user.click(screen.getByText(/dialog body/i));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // …but a click on the overlay does. The overlay fills the viewport, so
    // click near its edge by targeting a point left of the centred panel.
    const overlay = document.querySelector('.modal-overlay');
    overlay.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 1000,
      height: 800,
      right: 1000,
      bottom: 800,
      toJSON: () => {},
    });
    await user.click(overlay, undefined, { skipPointerEventsCheck: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

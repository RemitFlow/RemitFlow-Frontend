import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// axe-core attaches itself to the global window object when imported.
import 'axe-core';

const axe = window.axe;
import App from '../../src/App.jsx';

/**
 * Automated accessibility audit of the Send Money flow using axe-core.
 * Each state of the flow is scanned for WCAG violations:
 * 1. the empty form
 * 2. the form with visible validation errors
 * 3. the quote confirmation dialog
 * 4. the transfer-submitted result dialog
 *
 * Rules that require a real layout/paint pipeline (colour contrast from
 * stylesheets, landmark regions) cannot be evaluated reliably in jsdom and
 * are disabled; everything semantic is enforced.
 */
const JSDOM_LIMITED_RULES = {
  'color-contrast': { enabled: false },
  region: { enabled: false },
};

async function expectNoAxeViolations(container) {
  const results = await axe.run(container, {
    rules: JSDOM_LIMITED_RULES,
    resultTypes: ['violations'],
  });
  const summary = results.violations
    .map(
      (v) =>
        `${v.id} (${v.help}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    )
    .join('\n');
  expect(summary).toBe('');
}

describe('Send Money automated accessibility audit', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send');
    localStorage.clear();
  });

  it('has no axe violations on the initial form', async () => {
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: /send money/i });

    await expectNoAxeViolations(container);
  });

  it('has no axe violations with validation errors displayed', async () => {
    const { container } = render(<App />);
    const user = userEvent.setup();

    await screen.findByRole('button', { name: /review & send/i });
    await user.click(screen.getByRole('button', { name: /review & send/i }));
    await screen.findByText(/enter a valid email or stellar address/i);

    await expectNoAxeViolations(container);
  });

  it('has no axe violations in the quote confirmation dialog', async () => {
    const { container } = render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
    await user.type(screen.getByLabelText(/amount/i), '15');
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await expectNoAxeViolations(dialog);
  });

  it('has no axe violations in the transfer-submitted result dialog', async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
    await user.type(screen.getByLabelText(/amount/i), '15');
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    const dialog = await screen.findByRole('dialog', {
      name: /confirm your transfer/i,
    });
    await user.click(
      within(dialog).getByRole('button', { name: /confirm transfer/i }),
    );

    const resultDialog = await screen.findByRole(
      'dialog',
      { name: /transfer submitted/i },
      { timeout: 5000 },
    );
    await expectNoAxeViolations(resultDialog);
  }, 20000);
});

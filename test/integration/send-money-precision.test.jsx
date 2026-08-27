import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import * as api from '../../src/services/api.js';
import { formatCurrencyInput } from '../../src/utils/format.js';
import { MONEY_PLACEHOLDER } from '../../src/utils/money.js';
import { parseTransfer } from '../../src/services/contracts/transfer.js';

// Intl separates a currency code from its amount with a non-breaking space.
// Compare on the collapsed form so the expectations stay readable whatever
// Testing Library's normalizer does with it.
const money = (expected) => (content) =>
  content.replace(/ /g, ' ') === expected;

async function fillForm(user, { amount, to = 'NGN' } = {}) {
  await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
  const amountField = screen.getByLabelText(/^amount$/i);
  await user.type(amountField, amount);
  await user.tab();
  await user.selectOptions(screen.getByLabelText(/^to$/i), to);
  return amountField;
}

describe('Send flow — amount parsing regressions', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send');
    localStorage.clear();
    // The mock wallet service rejects 10% of connections at random. Pin it so
    // the send flow is deterministic without standing up a live provider.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The original failure mode: the blur handler stripped every non-digit
  // before parsing, so the perfectly valid `<input type="number">` value "1e3"
  // became the digits "13" — a 1000x under-send with no error anywhere.
  it('normalises exponent notation to its real value, not its digits', () => {
    expect(formatCurrencyInput('1e3')).toBe('1000.00');
    expect(formatCurrencyInput('1e3')).not.toBe('13.00');
  });

  it('keeps a negative amount negative so validation can reject it', async () => {
    const user = userEvent.setup();
    render(<App />);

    // "-5" used to be silently rewritten to "5.00" and sent as a real transfer.
    await fillForm(user, { amount: '-5' });
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue(-5);

    await user.click(screen.getByRole('button', { name: /review & send/i }));
    expect(
      await screen.findByText(/enter an amount greater than zero/i),
    ).toBeInTheDocument();
  });

  it('submits the exponent amount that the field actually held', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { amount: '1e3' });
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );
    expect(createTransfer).toHaveBeenCalledTimes(1);
    expect(createTransfer.mock.calls[0][0]).toMatchObject({
      sendAmount: '1000',
    });
  });
});

describe('Send flow — the receipt matches the quote', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send');
    localStorage.clear();
    // The mock wallet service rejects 10% of connections at random. Pin it so
    // the send flow is deterministic without standing up a live provider.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records the fee and rate so the receipt can be reproduced', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { amount: '200' });
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );

    // 200.00 - 1.10 fee = 198.90, at 1480.5 NGN/USD = 294471.45 exactly.
    const payload = createTransfer.mock.calls[0][0];
    expect(payload).toMatchObject({
      from: 'USD',
      to: 'NGN',
      sendAmount: '200',
      fee: '1.1',
      rate: '1480.5',
      receiveAmount: '294471.45',
    });
    expect(payload.expiresAt).toEqual(expect.any(String));
    // The stored record satisfies the contract it will later be read back with.
    expect(() =>
      parseTransfer({
        id: 'tx_check',
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...payload,
      }),
    ).not.toThrow();
  });

  it('shows the receipt row with the exact quoted amounts', async () => {
    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { amount: '200' });

    const quoteCard = (await screen.findByText(/transfer summary/i)).closest(
      '.quote-card',
    );
    await waitFor(() => {
      expect(
        within(quoteCard).getByText(money('NGN 294,471.45')),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /review & send/i }));
    await screen.findByRole(
      'heading',
      { name: /your transfers/i },
      { timeout: 5000 },
    );

    // The number on the receipt is the number that was quoted, to the cent.
    // The seeded demo transfer shares this recipient, so find the row by the
    // amount that was just quoted rather than by position.
    const rows = await screen.findAllByRole(
      'group',
      { name: /transfer to amina@exam/i },
      { timeout: 5000 },
    );
    const receipt = rows.find((row) =>
      within(row).queryByText(money('NGN 294,471.45')),
    );
    expect(receipt).toBeDefined();
    expect(within(receipt).getByText('$200.00')).toBeInTheDocument();
    expect(
      within(receipt).queryByText(MONEY_PLACEHOLDER),
    ).not.toBeInTheDocument();
  });
});

describe('Send flow — contract failures do not submit', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/send');
    localStorage.clear();
    // The mock wallet service rejects 10% of connections at random. Pin it so
    // the send flow is deterministic without standing up a live provider.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports a rejected payload distinctly from a transient failure', async () => {
    const { ContractViolationError } =
      await import('../../src/services/contracts/schema.js');
    const { transferContract } =
      await import('../../src/services/contracts/transfer.js');
    vi.spyOn(api, 'createTransfer').mockRejectedValueOnce(
      new ContractViolationError(
        transferContract,
        [
          {
            path: 'sendAmount',
            code: 'wrong_type',
            expected: 'decimal (number or numeric string)',
            received: 'object {value}',
          },
        ],
        { source: 'createTransfer' },
      ),
    );

    const user = userEvent.setup();
    render(<App />);

    await fillForm(user, { amount: '200' });
    await user.click(screen.getByRole('button', { name: /review & send/i }));

    expect(
      await screen.findByText(/rejected before it was sent/i, undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    // Nothing was submitted, so the user stays on the form and can correct it.
    expect(
      screen.getByRole('button', { name: /review & send/i }),
    ).toBeEnabled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('sendAmount'),
    );
  });

  it('explains an unquotable transfer instead of doing nothing', async () => {
    const createTransfer = vi.spyOn(api, 'createTransfer');
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/recipient/i), 'amina@example.com');
    await user.type(screen.getByLabelText(/^amount$/i), '50');
    await user.selectOptions(screen.getByLabelText(/^to$/i), 'NGN');

    // An unsupported corridor: buildQuote returns null and the old code
    // returned silently, leaving an enabled button and no explanation.
    const quote = await import('../../src/services/quote.js');
    vi.spyOn(quote, 'buildQuote').mockReturnValue(null);

    await user.click(screen.getByRole('button', { name: /review & send/i }));

    expect(
      await screen.findByText(/could not price this transfer/i, undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument();
    expect(createTransfer).not.toHaveBeenCalled();
  });
});

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TransferRow from '../../src/components/TransferRow.jsx';
import QuoteCard from '../../src/components/QuoteCard.jsx';
import { MONEY_PLACEHOLDER } from '../../src/utils/money.js';
import { parseTransfer } from '../../src/services/contracts/transfer.js';
import { loadFixture } from '../fixtures/index.js';

const V1 = 1;

// Intl separates a currency code from its amount with a non-breaking space.
// Compare on the collapsed form so the expectations stay readable whatever
// Testing Library's normalizer does with it.
const money = (expected) => (content) =>
  content.replace(/\u00a0/g, ' ') === expected;

function renderRow(overrides = {}) {
  const transfer = {
    ...parseTransfer(loadFixture(V1, 'transfer.pending')),
    ...overrides,
  };
  return render(<TransferRow transfer={transfer} locale="en-US" />);
}

describe('TransferRow — receipt amounts', () => {
  it('renders contract-normalised decimal strings', () => {
    renderRow();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('₹9,925.76')).toBeInTheDocument();
  });

  it('renders the same value whether the wire sent a number or a string', () => {
    const { unmount } = renderRow({ sendAmount: '120' });
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    unmount();

    renderRow({ sendAmount: 120 });
    expect(screen.getByText('$120.00')).toBeInTheDocument();
  });

  // The failure this change exists to prevent: an amount that failed to parse
  // used to be rendered as a confident "$0.00".
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['a money object', { value: '120.00', currency: 'USD' }],
    ['a formatted string', '1,20.00'],
  ])('shows a placeholder, not $0.00, when sendAmount is %s', (_l, value) => {
    renderRow({ sendAmount: value });
    expect(screen.getByText(MONEY_PLACEHOLDER)).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('keeps the destination amount when only the source amount is broken', () => {
    renderRow({ sendAmount: null });
    expect(screen.getByText('₹9,925.76')).toBeInTheDocument();
  });

  it('renders a genuine zero as a zero', () => {
    renderRow({ sendAmount: '0' });
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('renders a large destination amount without float rounding', () => {
    renderRow({ to: 'NGN', receiveAmount: '123456789012345678.99' });
    expect(
      screen.getByText(money('NGN 123,456,789,012,345,678.99')),
    ).toBeInTheDocument();
  });
});

describe('QuoteCard', () => {
  const quote = loadFixture(V1, 'quote');

  it('renders the quoted amounts and rate exactly as quoted', () => {
    render(<QuoteCard quote={quote} locale="en-US" />);
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    expect(screen.getByText('- $1.10')).toBeInTheDocument();
    expect(screen.getByText(money('NGN 294,471.45'))).toBeInTheDocument();
    expect(screen.getByText('1 USD = 1480.5000 NGN')).toBeInTheDocument();
  });

  it('renders a high-precision cross rate without truncating to an integer', () => {
    render(
      <QuoteCard quote={loadFixture(V1, 'quote.cross-rate')} locale="en-US" />,
    );
    // parseFloat('1,609.24') would have read this as 1.
    expect(screen.getByText('1 EUR = 1609.2391 NGN')).toBeInTheDocument();
    expect(screen.getByText(money('NGN 159,958.37'))).toBeInTheDocument();
  });

  it('renders nothing at all when there is no quote', () => {
    const { container } = render(<QuoteCard quote={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a placeholder rate rather than a wrong one', () => {
    render(<QuoteCard quote={{ ...quote, rate: null }} locale="en-US" />);
    const line = screen.getByText('Exchange rate').closest('.quote-line');
    expect(within(line).getByText('-')).toBeInTheDocument();
  });
});

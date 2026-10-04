import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQuote } from '../../src/services/quote.js';
import { QUOTE_TTL_MS } from '../../src/services/contracts/quote.js';
import {
  amountsReconcile,
  assertQuoteSignable,
  isQuoteBoundToInputs,
  mintQuoteId,
  quoteInputFingerprint,
  quoteSecondsRemaining,
  validateCurrencyPair,
} from '../../src/utils/quoteBinding.js';

const NOW = Date.parse('2026-09-24T19:00:00Z');

describe('quoteBinding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mints unique quote ids', () => {
    const a = mintQuoteId();
    const b = mintQuoteId();
    expect(a).toMatch(/^qt_/);
    expect(b).toMatch(/^qt_/);
    expect(a).not.toBe(b);
  });

  it('validates the currency matrix', () => {
    expect(validateCurrencyPair('USD', 'NGN').ok).toBe(true);
    expect(validateCurrencyPair('USD', 'USD').ok).toBe(false);
    expect(validateCurrencyPair('USD', 'XXX').ok).toBe(false);
    expect(validateCurrencyPair('YYY', 'NGN').ok).toBe(false);
  });

  it('fingerprints inputs canonically', () => {
    expect(
      quoteInputFingerprint({ amount: '10.00', from: 'usd', to: 'ngn' }),
    ).toBe(quoteInputFingerprint({ amount: '10', from: 'USD', to: 'NGN' }));
  });

  it('binds a built quote to its priced inputs', () => {
    const quote = buildQuote('25.50', 'USD', 'NGN', { now: NOW });
    expect(quote.id).toMatch(/^qt_/);
    expect(quote.source).toBe('fx.table');
    expect(
      isQuoteBoundToInputs(quote, { amount: '25.50', from: 'USD', to: 'NGN' }),
    ).toBe(true);
    expect(
      isQuoteBoundToInputs(quote, { amount: '25.51', from: 'USD', to: 'NGN' }),
    ).toBe(false);
    expect(
      isQuoteBoundToInputs(quote, { amount: '25.50', from: 'USD', to: 'INR' }),
    ).toBe(false);
  });

  it('rejects expired quotes at confirmation', () => {
    const quote = buildQuote('10', 'USD', 'NGN', {
      now: NOW,
      ttlMs: QUOTE_TTL_MS,
    });
    const inputs = { amount: '10.00', from: 'USD', to: 'NGN' };
    expect(assertQuoteSignable(quote, inputs, NOW + QUOTE_TTL_MS - 1).ok).toBe(
      true,
    );
    const expired = assertQuoteSignable(quote, inputs, NOW + QUOTE_TTL_MS);
    expect(expired.ok).toBe(false);
    expect(expired.code).toBe('expired');
  });

  it('rejects changed inputs after pricing', () => {
    const quote = buildQuote('10', 'USD', 'NGN', { now: NOW });
    const result = assertQuoteSignable(
      quote,
      {
        amount: '11.00',
        from: 'USD',
        to: 'NGN',
      },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('changed_input');
  });

  it('rejects unsupported currency pairs', () => {
    const quote = buildQuote('10', 'USD', 'NGN', { now: NOW });
    const result = assertQuoteSignable(
      { ...quote, from: 'USD', to: 'XXX' },
      { amount: '10.00', from: 'USD', to: 'XXX' },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('currency_matrix');
  });

  it('reconciles displayed and serialized amounts', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN', { now: NOW });
    expect(amountsReconcile(quote, { ...quote })).toBe(true);
    expect(amountsReconcile(quote, { ...quote, receiveAmount: '1.00' })).toBe(
      false,
    );
  });

  it('reports remaining seconds without going negative', () => {
    const quote = buildQuote('10', 'USD', 'EUR', { now: NOW, ttlMs: 5_000 });
    expect(quoteSecondsRemaining(quote, NOW)).toBe(5);
    expect(quoteSecondsRemaining(quote, NOW + 10_000)).toBe(0);
  });

  it('refuses to sign a quote without an id', () => {
    const quote = buildQuote('10', 'USD', 'NGN', { now: NOW });
    const { id, ...rest } = quote;
    const result = assertQuoteSignable(
      rest,
      {
        amount: '10.00',
        from: 'USD',
        to: 'NGN',
      },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.code).toBe('missing_quote_id');
  });
});

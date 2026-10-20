import { describe, expect, it } from 'vitest';
import { buildQuote, validateQuoteForTransfer } from '../../src/services/quote.js';

describe('buildQuote', () => {
  it('keeps submitted, fee, and receipt amounts as canonical decimal strings', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN');
    expect(quote).toMatchObject({
      sendAmount: '100.10',
      fee: '0.60',
      amountAfterFee: '99.50',
      receiveAmount: '147309.75',
    });
  });

  it('regresses binary floating-point drift at the receipt boundary', () => {
    const quote = buildQuote('0.30', 'USD', 'MXN');
    expect(quote.sendAmount).toBe('0.30');
    expect(quote.amountAfterFee).toBe('0.00');
    expect(quote.receiveAmount).toBe('0.00');
  });

  it('populates quote metadata: id, source, canonical amount, and currency metadata', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN');
    expect(typeof quote.quoteId).toBe('string');
    expect(quote.quoteId.length).toBeGreaterThan(0);
    expect(typeof quote.source).toBe('string');
    expect(quote.source.length).toBeGreaterThan(0);
    expect(quote.canonicalAmount).toBe('100.10');
    expect(quote.fromCurrency).toBe('USD');
    expect(quote.toCurrency).toBe('NGN');
    expect(quote.currencyMetadata).toMatchObject({
      from: 'USD',
      to: 'NGN',
    });
    expect(typeof quote.createdAt).toBe('number');
    expect(typeof quote.expiresAt).toBe('number');
    expect(quote.expiresAt).toBeGreaterThan(quote.createdAt);
  });

  it('produces distinct quote ids for distinct quotes', () => {
    const a = buildQuote('100.10', 'USD', 'NGN');
    const b = buildQuote('100.10', 'USD', 'NGN');
    expect(a.quoteId).not.toBe(b.quoteId);
  });
});

describe('validateQuoteForTransfer', () => {
  it('returns valid for a fresh matching quote', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN');
    const now = quote.createdAt + 1;
    const result = validateQuoteForTransfer(quote, {
      sendAmount: '100.10',
      fromCurrency: 'USD',
      toCurrency: 'NGN',
      now,
    });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('returns invalid for an expired quote using injected now', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN');
    const now = quote.expiresAt + 1;
    const result = validateQuoteForTransfer(quote, {
      sendAmount: '100.10',
      fromCurrency: 'USD',
      toCurrency: 'NGN',
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('expired');
  });

  it('returns invalid for a mismatched currency pair', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN');
    const now = quote.createdAt + 1;
    const result = validateQuoteForTransfer(quote, {
      sendAmount: '100.10',
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('currency_mismatch');
  });

  it('returns invalid for a precision/canonical-amount mismatch', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN');
    const now = quote.createdAt + 1;
    const result = validateQuoteForTransfer(quote, {
      sendAmount: '100.1',
      fromCurrency: 'USD',
      toCurrency: 'NGN',
      now,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('amount_mismatch');
  });

  it('returns invalid when the quote is missing', () => {
    const result = validateQuoteForTransfer(null, {
      sendAmount: '100.10',
      fromCurrency: 'USD',
      toCurrency: 'NGN',
      now: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('missing_quote');
  });
});
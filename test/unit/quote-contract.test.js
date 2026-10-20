import { describe, expect, it } from 'vitest';
import {
  loadBreakingFixtures,
  loadFixture,
  loadQuoteFixtures,
} from '../fixtures/index.js';
import {
  QUOTE_CONTRACT_VERSION,
  QUOTE_TTL_MS,
  isQuoteExpired,
  parseQuote,
  validateQuoteForTransfer,
} from '../../src/services/contracts/quote.js';
import { ContractViolationError } from '../../src/services/contracts/schema.js';
import { buildQuote, calculateFee } from '../../src/services/quote.js';
import { getRate, getRateDecimal, convert } from '../../src/services/fx.js';

const NOW = Date.parse('2026-08-01T10:00:00Z');

describe('parseQuote — v1 fixtures', () => {
  const fixtures = loadQuoteFixtures(QUOTE_CONTRACT_VERSION);

  it('records at least one quote fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it.each(fixtures.map(({ name }) => name))('%s parses', (name) => {
    const quote = parseQuote(loadFixture(QUOTE_CONTRACT_VERSION, name));
    expect(quote.version).toBe(QUOTE_CONTRACT_VERSION);
  });

  it.each(fixtures.map(({ name }) => name))(
    '%s carries the required freshness and currency metadata',
    (name) => {
      const quote = parseQuote(loadFixture(QUOTE_CONTRACT_VERSION, name));
      expect(typeof quote.quoteId).toBe('string');
      expect(quote.quoteId.length).toBeGreaterThan(0);
      expect(typeof quote.source).toBe('string');
      expect(quote.source.length).toBeGreaterThan(0);
      expect(typeof quote.canonicalAmount).toBe('string');
      expect(quote.canonicalAmount).toMatch(/^\d+(\.\d+)?$/);
      expect(quote.fromCurrency).toMatchObject({
        code: expect.any(String),
        decimals: expect.any(Number),
      });
      expect(quote.toCurrency).toMatchObject({
        code: expect.any(String),
        decimals: expect.any(Number),
      });
      expect(quote.fromCurrency.code).toBe(quote.from);
      expect(quote.toCurrency.code).toBe(quote.to);
    },
  );

  const EXPECTED_BREAKING = {
    'quote.missing-expiry': { path: 'expiresAt', code: 'missing_field' },
    'quote.formatted-rate': { path: 'rate', code: 'wrong_type' },
    'quote.missing-quote-id': { path: 'quoteId', code: 'missing_field' },
    'quote.formatted-canonical-amount': {
      path: 'canonicalAmount',
      code: 'wrong_type',
    },
  };

  it('has an expectation recorded for every breaking quote fixture', () => {
    const names = loadBreakingFixtures(QUOTE_CONTRACT_VERSION)
      .map(({ name }) => name)
      .filter((name) => name.startsWith('quote.'));
    expect(Object.keys(EXPECTED_BREAKING).sort()).toEqual(names.sort());
  });

  it.each(Object.entries(EXPECTED_BREAKING))(
    '%s is rejected with an actionable diff',
    (name, expected) => {
      const payload = loadFixture(QUOTE_CONTRACT_VERSION, name, {
        kind: 'breaking',
      });
      let error;
      try {
        parseQuote(payload);
      } catch (thrown) {
        error = thrown;
      }
      expect(error).toBeInstanceOf(ContractViolationError);
      expect(error.issues).toContainEqual(
        expect.objectContaining({ path: expected.path, code: expected.code }),
      );
      expect(error.message).toContain('Quote v1');
      expect(error.message).toContain(expected.path);
    },
  );

  it('rejects a display-formatted rate rather than reading it as 1', () => {
    // Number('1,480.50') is NaN and parseFloat('1,480.50') is 1 — both would
    // have produced a receipt that is wrong by three orders of magnitude.
    const payload = loadFixture(
      QUOTE_CONTRACT_VERSION,
      'quote.formatted-rate',
      {
        kind: 'breaking',
      },
    );
    expect(() => parseQuote(payload)).toThrow(/rate/);
    expect(Number.parseFloat(payload.rate)).toBe(1);
  });

  it('rejects a display-formatted canonical amount', () => {
    const payload = loadFixture(
      QUOTE_CONTRACT_VERSION,
      'quote.formatted-canonical-amount',
      { kind: 'breaking' },
    );
    expect(() => parseQuote(payload)).toThrow(/canonicalAmount/);
  });
});

describe('isQuoteExpired', () => {
  const quote = loadFixture(QUOTE_CONTRACT_VERSION, 'quote');

  it('is not expired before its expiry', () => {
    expect(isQuoteExpired(quote, Date.parse('2026-08-01T10:00:59Z'))).toBe(
      false,
    );
  });

  it('is expired at and after its expiry', () => {
    expect(isQuoteExpired(quote, Date.parse('2026-08-01T10:01:00Z'))).toBe(
      true,
    );
    expect(isQuoteExpired(quote, Date.parse('2026-08-01T10:05:00Z'))).toBe(
      true,
    );
  });

  it('accepts a Date as well as a timestamp', () => {
    expect(isQuoteExpired(quote, new Date('2026-08-01T10:05:00Z'))).toBe(true);
  });

  it('treats an unreadable expiry as expired rather than valid', () => {
    expect(isQuoteExpired({ expiresAt: 'not-a-date' }, NOW)).toBe(true);
  });
});

describe('validateQuoteForTransfer', () => {
  const quote = parseQuote(loadFixture(QUOTE_CONTRACT_VERSION, 'quote'));

  it('accepts a fresh quote whose payload matches', () => {
    const result = validateQuoteForTransfer(quote, {
      quoteId: quote.quoteId,
      from: quote.from,
      to: quote.to,
      sendAmount: quote.sendAmount,
      now: Date.parse('2026-08-01T10:00:30Z'),
    });
    expect(result).toEqual({ ok: true });
  });

  it('rejects an expired quote', () => {
    const result = validateQuoteForTransfer(quote, {
      quoteId: quote.quoteId,
      from: quote.from,
      to: quote.to,
      sendAmount: quote.sendAmount,
      now: Date.parse('2026-08-01T10:01:00Z'),
    });
    expect(result).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('rejects a quote whose id does not match the payload', () => {
    const result = validateQuoteForTransfer(quote, {
      quoteId: 'quote_other',
      from: quote.from,
      to: quote.to,
      sendAmount: quote.sendAmount,
      now: NOW,
    });
    expect(result).toMatchObject({ ok: false, reason: 'quote_id_mismatch' });
  });

  it('rejects a currency mismatch', () => {
    const result = validateQuoteForTransfer(quote, {
      quoteId: quote.quoteId,
      from: 'EUR',
      to: quote.to,
      sendAmount: quote.sendAmount,
      now: NOW,
    });
    expect(result).toMatchObject({ ok: false, reason: 'currency_mismatch' });
  });

  it('rejects an amount that does not reconcile with the canonical amount', () => {
    const result = validateQuoteForTransfer(quote, {
      quoteId: quote.quoteId,
      from: quote.from,
      to: quote.to,
      sendAmount: '200.001',
      now: NOW,
    });
    expect(result).toMatchObject({ ok: false, reason: 'amount_mismatch' });
  });

  it('rejects an amount with more precision than the source currency allows', () => {
    const result = validateQuoteForTransfer(quote, {
      quoteId: quote.quoteId,
      from: quote.from,
      to: quote.to,
      sendAmount: '200.123',
      now: NOW,
    });
    expect(result).toMatchObject({ ok: false, reason: 'precision' });
  });

  it('rejects an unparseable amount', () => {
    const result = validateQuoteForTransfer(quote, {
      quoteId: quote.quoteId,
      from: quote.from,
      to: quote.to,
      sendAmount: 'abc',
      now: NOW,
    });
    expect(result).toMatchObject({ ok: false, reason: 'precision' });
  });
});

describe('fx rates', () => {
  it('derives an exact cross rate', () => {
    // 1480.5 / 0.92 in binary floating point is 1609.2391304347825.
    expect(getRateDecimal('EUR', 'NGN')).toBe('1609.239130434783');
    expect(getRateDecimal('USD', 'NGN')).toBe('1480.5');
    expect(getRateDecimal('NGN', 'NGN')).toBe('1');
  });

  it('returns null for an unsupported pair instead of NaN', () => {
    expect(getRateDecimal('USD', 'XXX')).toBeNull();
    expect(getRate('XXX', 'USD')).toBeNull();
    expect(convert(100, 'USD', 'XXX')).toBeNull();
  });

  it('refuses to convert an unparseable amount instead of returning 0', () => {
    expect(convert(null, 'USD', 'NGN')).toBeNull();
    expect(convert('', 'USD', 'NGN')).toBeNull();
    expect(convert('abc', 'USD', 'NGN')).toBeNull();
  });
});

describe('calculateFee', () => {
  it('charges the percentage plus the flat fee', () => {
    // 0.5% of 200.00 is 1.00, plus a 0.10 flat fee.
    expect(calculateFee('200', 'USD')).toBe('1.10');
    expect(calculateFee('1234.56', 'USD')).toBe('6.27');
  });

  it('applies the minimum fee to small transfers', () => {
    expect(calculateFee('10', 'USD')).toBe('0.25');
    expect(calculateFee('0', 'USD')).toBe('0.25');
  });

  it('uses the destination currency minor unit', () => {
    expect(calculateFee('10000', 'JPY')).toBe('50');
  });

  it('returns null rather than a fee of 0.25 on garbage input', () => {
    expect(calculateFee(null)).toBeNull();
    expect(calculateFee('abc')).toBeNull();
    expect(calculateFee('')).toBeNull();
  });
});

describe('buildQuote', () => {
  it('produces a contract-valid quote', () => {
    const quote = buildQuote('200', 'USD', 'NGN', { now: NOW });
    expect(() => parseQuote(quote)).not.toThrow();
    expect(quote).toMatchObject({
      version: QUOTE_CONTRACT_VERSION,
      from: 'USD',
      to: 'NGN',
      rate: '1480.5',
      sendAmount: '200',
      fee: '1.1',
      amountAfterFee: '198.9',
      receiveAmount: '294471.45',
      createdAt: '2026-08-01T10:00:00.000Z',
      expiresAt: '2026-08-01T10:01:00.000Z',
    });
  });

  it('matches an independently computed cross-currency quote', () => {
    // 100 EUR - 0.60 fee = 99.40, at 1609.239130434783 NGN/EUR = 159958.37.
    expect(buildQuote('100', 'EUR', 'NGN', { now: NOW })).toMatchObject({
      fee: '0.6',
      amountAfterFee: '99.4',
      receiveAmount: '159958.37',
    });
  });

  it('is deterministic for the same inputs', () => {
    expect(buildQuote('137.77', 'GBP', 'MXN', { now: NOW })).toEqual(
      buildQuote('137.77', 'GBP', 'MXN', { now: NOW }),
    );
  });

  it('accepts numbers and equivalent strings interchangeably', () => {
    expect(buildQuote(200, 'USD', 'NGN', { now: NOW })).toEqual(
      buildQuote('200.00', 'USD', 'NGN', { now: NOW }),
    );
  });

  it('never lets the fee push the receive amount negative', () => {
    const quote = buildQuote('0.05', 'USD', 'NGN', { now: NOW });
    expect(quote.amountAfterFee).toBe('0');
    expect(quote.receiveAmount).toBe('0');
  });

  it('rounds to the destination currency minor unit', () => {
    const quote = buildQuote('100', 'USD', 'INR', { now: NOW });
    // 100.00 - 0.60 fee = 99.40, and 99.40 * 83.2 = 8270.08 exactly.
    expect(quote.receiveAmount).toBe('8270.08');
    expect(quote.receiveAmount).not.toMatch(/0000\d$/);
  });

  it('expires TTL milliseconds after it is built', () => {
    const quote = buildQuote('200', 'USD', 'NGN', { now: NOW });
    expect(Date.parse(quote.expiresAt) - Date.parse(quote.createdAt)).toBe(
      QUOTE_TTL_MS,
    );
    expect(isQuoteExpired(quote, NOW + QUOTE_TTL_MS)).toBe(true);
  });

  it('returns null for an unsupported pair', () => {
    expect(buildQuote('200', 'USD', 'XXX', { now: NOW })).toBeNull();
  });

  // Regression: the old implementation ran `Number(amount) || 0` and quoted a
  // real transfer of 0.00 for any unparseable amount.
  it.each([null, undefined, '', 'abc', {}, [], Number.NaN])(
    'returns null rather than a zero quote for %s',
    (amount) => {
      expect(buildQuote(amount, 'USD', 'NGN', { now: NOW })).toBeNull();
    },
  );
});

import { describe, expect, it } from 'vitest';
import { buildQuote } from '../../src/services/quote.js';

describe('buildQuote', () => {
  it('keeps submitted, fee, and receipt amounts as canonical decimal strings', () => {
    const quote = buildQuote('100.10', 'USD', 'NGN');
    // The quote contract removes redundant zeros while preserving exact values.
    expect(quote).toMatchObject({
      sendAmount: '100.1',
      fee: '0.6',
      amountAfterFee: '99.5',
      receiveAmount: '147309.75',
    });
  });

  it('regresses binary floating-point drift at the receipt boundary', () => {
    const quote = buildQuote('0.30', 'USD', 'MXN');
    expect(quote.sendAmount).toBe('0.3');
    // The minimum fee is 0.25: 0.05 * 17.1 = 0.855, rounded to 0.86 MXN.
    expect(quote.fee).toBe('0.25');
    expect(quote.amountAfterFee).toBe('0.05');
    expect(quote.receiveAmount).toBe('0.86');

    expect(buildQuote('0.20', 'USD', 'MXN')).toMatchObject({
      amountAfterFee: '0',
      receiveAmount: '0',
    });
  });
});

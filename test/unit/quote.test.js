import { describe, expect, it } from 'vitest';
import { buildQuote } from '../../src/services/quote.js';

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
});

import { describe, expect, it } from 'vitest';
import {
  MONEY_PLACEHOLDER,
  compareDecimal,
  convertMinorUnits,
  currencyExponent,
  divideDecimal,
  formatMoney,
  fromMinorUnits,
  parseDecimal,
  quantize,
  requireDecimal,
  scaleMinorUnits,
  toMinorUnits,
} from '../../src/utils/money.js';

describe('parseDecimal — safe numeric parsing', () => {
  it('accepts numbers and numeric strings', () => {
    expect(parseDecimal(200)).toEqual({ ok: true, value: '200' });
    expect(parseDecimal('200.00')).toEqual({ ok: true, value: '200' });
    expect(parseDecimal('  -12.5  ')).toEqual({ ok: true, value: '-12.5' });
    expect(parseDecimal('+0.10')).toEqual({ ok: true, value: '0.1' });
    expect(parseDecimal(0)).toEqual({ ok: true, value: '0' });
    expect(parseDecimal(-0)).toEqual({ ok: true, value: '0' });
  });

  it('expands exponent notation instead of mangling it', () => {
    expect(parseDecimal('1e3').value).toBe('1000');
    expect(parseDecimal('1.5e-4').value).toBe('0.00015');
    expect(parseDecimal(1e21).value).toBe('1000000000000000000000');
  });

  // These are the values Number() silently maps to 0 — the coercion that let a
  // broken payload render as "$0.00" instead of raising anything.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace', '   '],
    ['empty array', []],
    ['false', false],
    ['true', true],
    ['object', {}],
    ['money object', { value: '200.00', currency: 'USD' }],
  ])('refuses to coerce %s to a number', (_label, value) => {
    const parsed = parseDecimal(value);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatch(/expected/);
  });

  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['non-numeric string', 'not-a-number'],
    ['trailing junk', '12.5abc'],
    ['grouped string', '1,480.50'],
    ['hex literal', '0x1f'],
    ['numeric separators', '1_000'],
    ['double decimal point', '1.2.3'],
    ['bare decimal point', '.'],
  ])('rejects %s', (_label, value) => {
    expect(parseDecimal(value).ok).toBe(false);
  });

  it('reports what actually arrived, so a log line is debuggable', () => {
    expect(parseDecimal({ value: 1 }).error).toContain('object {value}');
    expect(parseDecimal('oops').error).toContain('"oops"');
    expect(parseDecimal([1, 2]).error).toContain('array(2)');
  });

  it('normalises equal values to the same string', () => {
    expect(parseDecimal('200.00').value).toBe(parseDecimal(200).value);
    expect(parseDecimal('0.50').value).toBe(parseDecimal('.5').value);
    expect(parseDecimal('-0.0').value).toBe('0');
  });

  it('throws with a labelled message via requireDecimal', () => {
    expect(() => requireDecimal(null, 'sendAmount')).toThrow(/sendAmount:/);
    expect(requireDecimal('7.5')).toBe('7.5');
  });
});

describe('minor units — exact arithmetic', () => {
  it('round-trips through integer minor units', () => {
    expect(toMinorUnits('200.00', 2)).toBe(20000n);
    expect(fromMinorUnits(20000n, 2)).toBe('200.00');
    expect(fromMinorUnits(5n, 2)).toBe('0.05');
    expect(fromMinorUnits(-5n, 2)).toBe('-0.05');
    expect(fromMinorUnits(1234n, 0)).toBe('1234');
  });

  it('rounds half away from zero', () => {
    expect(toMinorUnits('2.345', 2)).toBe(235n);
    expect(toMinorUnits('2.344', 2)).toBe(234n);
    expect(toMinorUnits('-2.345', 2)).toBe(-235n);
    expect(toMinorUnits('2.3449', 2)).toBe(234n);
  });

  it('honours a currency minor unit that is not 1/100', () => {
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent(undefined)).toBe(2);
    expect(toMinorUnits('1234.50', currencyExponent('JPY'))).toBe(1235n);
  });

  it('does not accumulate binary floating point error', () => {
    // 0.1 + 0.2 !== 0.3 as floats; as minor units it is exact.
    const sum = toMinorUnits('0.1', 2) + toMinorUnits('0.2', 2);
    expect(fromMinorUnits(sum, 2)).toBe('0.30');
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it('keeps large amounts exact beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = '123456789012345678.99';
    expect(fromMinorUnits(toMinorUnits(huge, 2), 2)).toBe(huge);
    // The float round trip loses the last digits.
    expect(Number(huge).toFixed(2)).not.toBe(huge);
  });
});

describe('rate application', () => {
  it('divides to an exact cross rate', () => {
    expect(divideDecimal('1480.5', '0.92')).toBe('1609.239130434783');
    expect(divideDecimal('17.1', '0.79')).toBe('21.645569620253');
    expect(divideDecimal('1', '0')).toBeNull();
  });

  it('converts between currencies of equal precision', () => {
    const received = convertMinorUnits(19890n, '1480.5', 2, 2);
    expect(fromMinorUnits(received, 2)).toBe('294471.45');
  });

  it('converts into a zero-decimal currency', () => {
    // 100.00 USD at 155.25 JPY/USD is 15525 yen, not 15525.00.
    const received = convertMinorUnits(10000n, '155.25', 2, 0);
    expect(fromMinorUnits(received, 0)).toBe('15525');
  });

  it('converts out of a zero-decimal currency', () => {
    const received = convertMinorUnits(15525n, '0.0064412', 0, 2);
    expect(fromMinorUnits(received, 2)).toBe('100.00');
  });

  it('scales by a percentage without float drift', () => {
    // 0.5% of 1234.56 is 6.1728, which rounds to 6.17.
    expect(fromMinorUnits(scaleMinorUnits(123456n, '0.005'), 2)).toBe('6.17');
    expect(fromMinorUnits(scaleMinorUnits(100n, '0.005'), 2)).toBe('0.01');
  });

  it('compares decimals exactly at the boundary', () => {
    expect(compareDecimal('0.30000000000000004', '0.3')).toBe(1);
    expect(compareDecimal('200.00', 200)).toBe(0);
    expect(compareDecimal('-1', '1')).toBe(-1);
  });

  it('quantizes to a currency minor unit', () => {
    expect(quantize('10.005', 'USD')).toBe('10.01');
    expect(quantize('10.004', 'USD')).toBe('10.00');
    expect(quantize('1234.5', 'JPY')).toBe('1235');
  });
});

describe('formatMoney', () => {
  it('formats parseable values with the currency minor unit', () => {
    expect(formatMoney('294471.45', 'NGN', 'en-US')).toBe(
      'NGN\u00a0294,471.45',
    );
    expect(formatMoney('1234.50', 'USD', 'en-US')).toBe('$1,234.50');
    expect(formatMoney(200, 'USD', 'en-US')).toBe('$200.00');
    // JPY has no minor unit; two decimals would be wrong, not just ugly.
    expect(formatMoney('1234.50', 'JPY', 'en-US')).toBe('¥1,235');
  });

  it('formats large amounts without a float round trip', () => {
    expect(formatMoney('123456789012345678.99', 'NGN', 'en-US')).toBe(
      'NGN\u00a0123,456,789,012,345,678.99',
    );
  });

  // The regression this whole module exists for: an unparseable amount used to
  // render as a confident, wrong "$0.00".
  it.each([null, undefined, '', 'not-a-number', {}, [], Number.NaN])(
    'renders a placeholder rather than a fabricated zero for %s',
    (value) => {
      const rendered = formatMoney(value, 'USD', 'en-US');
      expect(rendered).toBe(MONEY_PLACEHOLDER);
      expect(rendered).not.toContain('0.00');
    },
  );

  it('falls back rather than throwing on an unusable currency code', () => {
    expect(formatMoney('10.00', 'NOT_A_CODE', 'en-US')).toBe(MONEY_PLACEHOLDER);
  });

  it('respects an explicit locale', () => {
    expect(formatMoney('1234.50', 'EUR', 'de-DE')).toBe('1.234,50 €');
  });

  it('allows the caller to choose its own fallback', () => {
    expect(formatMoney(null, 'USD', 'en-US', { fallback: 'n/a' })).toBe('n/a');
  });
});

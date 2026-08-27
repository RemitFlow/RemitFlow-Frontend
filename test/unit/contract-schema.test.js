import { describe, expect, it } from 'vitest';
import {
  ContractViolationError,
  defineContract,
  formatIssues,
  parseOrThrow,
  validate,
} from '../../src/services/contracts/schema.js';

const contract = defineContract({
  name: 'Sample',
  version: 3,
  fields: {
    id: { type: 'string', required: true, minLength: 1 },
    currency: { type: 'currency', required: true },
    amount: { type: 'decimal', required: true, min: 0 },
    attempts: { type: 'integer', required: false },
    live: { type: 'boolean', required: false },
    at: { type: 'timestamp', required: true },
    state: {
      type: 'enum',
      required: true,
      values: ['open', 'closed'],
      aliases: { finished: 'closed' },
    },
    note: { type: 'string', required: false, nullable: true },
    tier: { type: 'string', required: false, default: 'standard' },
  },
});

const VALID = {
  id: 'sample_1',
  currency: 'USD',
  amount: '10.50',
  at: '2026-08-01T10:00:00Z',
  state: 'open',
};

describe('defineContract', () => {
  it('labels the contract with its name and version', () => {
    expect(contract.id).toBe('Sample v3');
  });

  it('refuses a field with an unknown type at definition time', () => {
    expect(() =>
      defineContract({
        name: 'Bad',
        version: 1,
        fields: { x: { type: 'quaternion' } },
      }),
    ).toThrow(/unknown type "quaternion"/);
  });
});

describe('validate', () => {
  it('accepts a conforming payload and normalises decimals to strings', () => {
    const result = validate(contract, { ...VALID, amount: 10.5 });
    expect(result.ok).toBe(true);
    expect(result.value.amount).toBe('10.5');
  });

  it('applies defaults for absent optional fields', () => {
    expect(validate(contract, VALID).value.tier).toBe('standard');
  });

  it('keeps an explicit null in a nullable field', () => {
    const result = validate(contract, { ...VALID, note: null });
    expect(result.ok).toBe(true);
    expect(result.value.note).toBeNull();
  });

  it('treats a null in a non-nullable required field as missing', () => {
    const result = validate(contract, { ...VALID, amount: null });
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: 'amount', code: 'missing_field' }),
    );
  });

  it('normalises a known alias without raising an issue', () => {
    const result = validate(contract, { ...VALID, state: 'finished' });
    expect(result.ok).toBe(true);
    expect(result.value.state).toBe('closed');
  });

  it('reports an unknown enum value with the supported set', () => {
    const result = validate(contract, { ...VALID, state: 'pending' });
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toMatchObject({
      path: 'state',
      code: 'invalid_enum',
    });
    expect(result.issues[0].expected).toContain('open, closed');
  });

  it('collects every issue rather than stopping at the first', () => {
    const result = validate(contract, {
      id: '',
      currency: 'usd',
      amount: 'free',
      at: 12345,
      state: 'unknown',
    });
    expect(result.issues.map((i) => i.path).sort()).toEqual([
      'amount',
      'at',
      'currency',
      'id',
      'state',
    ]);
  });

  it('rejects a payload that is not an object', () => {
    for (const value of [null, undefined, 'x', 42, []]) {
      const result = validate(contract, value);
      expect(result.ok).toBe(false);
      expect(result.issues[0].code).toBe('not_an_object');
    }
  });

  it('allows and preserves unknown fields (forward compatible)', () => {
    const result = validate(contract, { ...VALID, brandNewField: [1, 2] });
    expect(result.ok).toBe(true);
    expect(result.value.brandNewField).toEqual([1, 2]);
  });

  it('reports a snake_case rename as a rename, not a missing field', () => {
    const { amount, ...rest } = VALID;
    const result = validate(contract, { ...rest, Amount_: amount });
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: 'amount', code: 'renamed_field' }),
    );
    expect(result.issues[0].hint).toContain('renamed "amount"');
  });

  it('enforces numeric bounds', () => {
    const result = validate(contract, { ...VALID, amount: '-1' });
    expect(result.issues[0].expected).toBe('decimal >= 0');
  });

  it('rejects an unsafe integer', () => {
    const result = validate(contract, {
      ...VALID,
      attempts: Number.MAX_SAFE_INTEGER + 2,
    });
    expect(result.issues[0]).toMatchObject({
      path: 'attempts',
      code: 'wrong_type',
    });
  });

  it('returns no value when there are issues, so a caller cannot use it', () => {
    expect(validate(contract, { ...VALID, state: 'nope' }).value).toBeNull();
  });
});

describe('formatIssues', () => {
  const issues = validate(contract, {
    ...VALID,
    amount: { value: '10.50' },
    state: 'nope',
  }).issues;

  const message = formatIssues(contract, issues, { source: 'GET /samples' });

  it('names the contract, the source and the issue count', () => {
    expect(message).toContain('Sample v3 contract mismatch from GET /samples');
    expect(message).toContain('(2 issues)');
  });

  it('gives one expected/received line per issue', () => {
    expect(message).toContain(
      'amount: expected decimal (number or numeric string), received object {value}',
    );
    expect(message).toContain('state: expected one of [open, closed]');
  });

  it('says what to do about it', () => {
    expect(message).toContain('update the adapter for Sample v3');
    expect(message).toContain('test/fixtures/v3/');
  });

  it('uses the singular for a single issue', () => {
    const single = formatIssues(contract, [issues[0]]);
    expect(single).toContain('(1 issue)');
  });
});

describe('parseOrThrow', () => {
  it('returns the normalised value when the payload conforms', () => {
    expect(parseOrThrow(contract, VALID).id).toBe('sample_1');
  });

  it('throws a ContractViolationError carrying the structured issues', () => {
    let error;
    try {
      parseOrThrow(contract, { ...VALID, amount: 'free' }, { source: 'api' });
    } catch (thrown) {
      error = thrown;
    }
    expect(error).toBeInstanceOf(ContractViolationError);
    expect(error.name).toBe('ContractViolationError');
    expect(error.contract).toBe('Sample v3');
    expect(error.version).toBe(3);
    expect(error.source).toBe('api');
    expect(error.issues).toHaveLength(1);
    expect(error.message).toBe(
      formatIssues(contract, error.issues, { source: 'api' }),
    );
  });
});

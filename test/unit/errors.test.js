import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  canRetry,
  getUserErrorMessage,
  normalizeError,
} from '../../src/services/errors.js';

describe('error normalization', () => {
  it('drops malformed provider payloads and sensitive values', () => {
    const normalized = normalizeError({
      payload: {
        credentialLikeValue: 'SENSITIVE_VALUE',
        address: 'GFAKEPUBLICADDRESS1234567890',
      },
      message: 'provider returned SENSITIVE_VALUE',
    });

    expect(normalized).toEqual({
      code: ERROR_CODES.UNKNOWN,
      retryable: false,
      correlationId: null,
    });
    const serialized = JSON.stringify(normalized);
    expect(serialized).not.toContain('SENSITIVE_VALUE');
    expect(serialized).not.toContain('GFAKEPUBLICADDRESS');
  });

  it('maps wallet cancellation separately and does not retry it', () => {
    const normalized = normalizeError(
      new Error('User rejected the connection request'),
      { source: 'wallet' },
    );

    expect(normalized.code).toBe(ERROR_CODES.WALLET_REJECTED);
    expect(canRetry(normalized)).toBe(false);
    expect(getUserErrorMessage(normalized)).toBe(
      'Wallet connection was cancelled.',
    );
  });

  it('marks timeouts, rate limits, and server failures retryable', () => {
    expect(normalizeError(new Error('Connection timeout'))).toMatchObject({
      code: ERROR_CODES.TIMEOUT,
      retryable: true,
    });
    expect(normalizeError({ status: 429 })).toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
      retryable: true,
    });
    expect(normalizeError({ response: { status: 503 } })).toMatchObject({
      code: ERROR_CODES.UNAVAILABLE,
      retryable: true,
    });
  });

  it('retains only a validated correlation identifier', () => {
    const normalized = normalizeError({
      status: 503,
      correlationId: 'req_abc-123:west',
      message: 'provider returned PRIVATE_VALUE',
      response: { data: { detail: 'RAW_PROVIDER_DATA' } },
    });

    expect(normalized).toEqual({
      code: ERROR_CODES.UNAVAILABLE,
      retryable: true,
      correlationId: 'req_abc-123:west',
    });
    const serialized = JSON.stringify(normalized);
    expect(serialized).not.toContain('PRIVATE_VALUE');
    expect(serialized).not.toContain('RAW_PROVIDER_DATA');
  });

  it('drops unsafe correlation identifiers', () => {
    expect(
      normalizeError({ correlationId: 'unsafe correlation value' })
        .correlationId,
    ).toBeNull();
  });
});

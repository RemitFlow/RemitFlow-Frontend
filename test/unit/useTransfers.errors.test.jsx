import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTransfers } from '../../src/hooks/useTransfers.js';
import * as api from '../../src/services/api.js';

describe('useTransfers error retry policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('withholds reload while a non-retryable error is displayed', async () => {
    vi.spyOn(api, 'listTransfers').mockRejectedValue({ status: 400 });

    const { result } = renderHook(() => useTransfers());

    await waitFor(() => {
      expect(result.current.error).toBe('Something went wrong. Please try again.');
    });

    expect(result.current.retryable).toBe(false);
    expect(result.current.reload).toBeUndefined();
  });

  it('keeps reload available for a retryable service failure', async () => {
    vi.spyOn(api, 'listTransfers').mockRejectedValue({ status: 503 });

    const { result } = renderHook(() => useTransfers());

    await waitFor(() => {
      expect(result.current.error).toBe(
        'The service is temporarily unavailable. Please try again.',
      );
    });

    expect(result.current.retryable).toBe(true);
    expect(result.current.reload).toEqual(expect.any(Function));
  });
});

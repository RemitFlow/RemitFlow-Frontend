export const ERROR_CODES = Object.freeze({
  WALLET_REJECTED: 'wallet_rejected',
  TIMEOUT: 'timeout',
  RATE_LIMITED: 'rate_limited',
  UNAVAILABLE: 'unavailable',
  UNKNOWN: 'unknown',
});

const SAFE_MESSAGES = Object.freeze({
  [ERROR_CODES.WALLET_REJECTED]: 'Wallet connection was cancelled.',
  [ERROR_CODES.TIMEOUT]: 'The request timed out. Please try again.',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please wait and try again.',
  [ERROR_CODES.UNAVAILABLE]:
    'The service is temporarily unavailable. Please try again.',
  [ERROR_CODES.UNKNOWN]: 'Something went wrong. Please try again.',
});

function readStatus(error) {
  const status = Number(error?.status ?? error?.response?.status);
  return Number.isFinite(status) ? status : null;
}

function readCorrelationId(error) {
  const candidates = [
    error?.correlationId,
    error?.requestId,
    error?.response?.headers?.get?.('x-correlation-id'),
    error?.response?.headers?.get?.('x-request-id'),
  ];
  const value = candidates.find((candidate) => typeof candidate === 'string');
  if (!value) return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(trimmed) ? trimmed : null;
}

function readMessage(error) {
  return typeof error?.message === 'string' ? error.message : '';
}

function isWalletRejected(error) {
  const code = error?.code;
  if (code === 4001 || code === '4001' || code === 'USER_REJECTED') return true;
  return /user.*(reject|denied|cancel)|request.*(reject|denied|cancel)/i.test(
    readMessage(error),
  );
}

function isTimeout(error, status) {
  const code = error?.code;
  return (
    status === 408 ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNABORTED' ||
    error?.name === 'AbortError' ||
    /timeout|timed out/i.test(readMessage(error))
  );
}

export function normalizeError(error, { source = 'api' } = {}) {
  const status = readStatus(error);
  let code = ERROR_CODES.UNKNOWN;
  let retryable = false;

  if (source === 'wallet' && isWalletRejected(error)) {
    code = ERROR_CODES.WALLET_REJECTED;
  } else if (isTimeout(error, status)) {
    code = ERROR_CODES.TIMEOUT;
    retryable = true;
  } else if (status === 429) {
    code = ERROR_CODES.RATE_LIMITED;
    retryable = true;
  } else if (
    status === 425 ||
    (status !== null && status >= 500) ||
    ['ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN'].includes(error?.code)
  ) {
    code = ERROR_CODES.UNAVAILABLE;
    retryable = true;
  }

  return Object.freeze({
    code,
    retryable,
    correlationId: readCorrelationId(error),
  });
}

export function getUserErrorMessage(normalizedError) {
  return SAFE_MESSAGES[normalizedError?.code] ?? SAFE_MESSAGES[ERROR_CODES.UNKNOWN];
}

export function canRetry(normalizedError) {
  return normalizedError?.retryable === true;
}

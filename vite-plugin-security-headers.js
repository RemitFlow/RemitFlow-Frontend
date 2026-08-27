/**
 * vite-plugin-security-headers.js
 *
 * Injects production-quality HTTP security headers into Vite's dev and preview
 * servers.  The same header values are exported as `SECURITY_HEADERS` so that
 * a CDN/reverse-proxy config (nginx, Cloudflare, etc.) can import and reuse
 * them, and so the test suite can assert the exact policy without duplicating
 * the string.
 *
 * Design notes
 * ─────────────
 * • `script-src 'self'`     – React/router are fully bundled; no CDN scripts.
 * • `connect-src`           – Stellar Horizon (testnet + mainnet) and the
 *                             backend API origin are the only XHR/fetch targets.
 *                             Freighter and Albedo wallets communicate via the
 *                             browser-extension postMessage bridge, NOT via
 *                             fetch, so they need no connect-src entry.
 * • `form-action 'self'`    – No cross-origin form POSTs.
 * • `frame-ancestors 'none'`– Prevents clickjacking; stronger than X-Frame.
 * • `upgrade-insecure-requests` – Forces HTTPS for sub-resource loads in prod.
 * • `object-src 'none'`     – Blocks <object>/<embed>/<applet> (plugin code).
 *
 * Wallet / provider exceptions
 * ─────────────────────────────
 * Freighter (STELLAR_EXPERT) and Albedo wallet extensions inject a content
 * script into the page and communicate through `window.postMessage`.  They do
 * NOT load external scripts or make fetch calls from the page context, so no
 * special CSP exemption is required.  If a future integration loads the
 * Freighter SDK from a CDN, add that CDN origin to `script-src` here and
 * document the reason.
 */

/** Stellar Horizon origins that the Stellar SDK connects to. */
const STELLAR_HORIZON_ORIGINS = [
  'https://horizon-testnet.stellar.org',
  'https://horizon.stellar.org',
];

/**
 * Backend API origin.  Falls back to 'self' when the env var is absent (e.g.
 * in the mock / demo mode where all API calls are localStorage-only).
 * We extract only the origin (scheme + host + port) to avoid leaking paths.
 */
function apiOrigin() {
  const raw = process.env.VITE_API_BASE_URL || '';
  try {
    return raw ? new URL(raw).origin : null;
  } catch {
    return null;
  }
}

/**
 * Build the Content-Security-Policy header value.
 * Kept as a function so it can be called with a custom apiOrigin in tests.
 *
 * @param {string|null} [apiOrig] - override the API origin (for tests)
 * @returns {string}
 */
export function buildCsp(apiOrig = apiOrigin()) {
  const connectSrc = ["'self'", ...STELLAR_HORIZON_ORIGINS];
  if (apiOrig && apiOrig !== 'null' && !connectSrc.includes(apiOrig)) {
    connectSrc.push(apiOrig);
  }

  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",   // CSS-in-JS / Vite inlines a tiny style tag
    "img-src 'self' data:",               // data: URIs used by chart canvas toDataURL
    `connect-src ${connectSrc.join(' ')}`,
    "font-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

/**
 * The full set of security response headers applied to every request.
 * Exported so nginx/Cloudflare config generators and tests can import them.
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': buildCsp(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * Vite plugin: applies SECURITY_HEADERS to the dev server and the preview
 * server so that local testing reflects production behaviour.
 *
 * @returns {import('vite').Plugin}
 */
export default function securityHeaders() {
  /** Middleware that sets every header on every response. */
  function middleware(_req, res, next) {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(name, value);
    }
    next();
  }

  return {
    name: 'security-headers',
    // dev server
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    // `vite preview` (production-equivalent)
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

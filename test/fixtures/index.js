// Versioned API fixtures.
//
// Every supported response shape lives on disk as JSON under
// `test/fixtures/v<N>/`, so a contract change has to be made in two places at
// once: the schema and the recorded payloads. Fixtures are discovered from the
// directory rather than listed here, so adding a state means adding a file and
// nothing else — and deleting a state's fixture makes its test disappear
// loudly rather than silently.
//
//   v1/            payloads that MUST parse
//   v1/breaking/   payloads that MUST be rejected with an actionable diff
//
// Nothing here touches the network or the clock.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURE_ROOT = path.dirname(fileURLToPath(import.meta.url));

/** Contract versions with a recorded fixture set. */
export const SUPPORTED_FIXTURE_VERSIONS = fs
  .readdirSync(FIXTURE_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^v\d+$/.test(entry.name))
  .map((entry) => Number(entry.name.slice(1)))
  .sort((a, b) => a - b);

function directoryFor(version, kind) {
  return kind === 'breaking'
    ? path.join(FIXTURE_ROOT, `v${version}`, 'breaking')
    : path.join(FIXTURE_ROOT, `v${version}`);
}

/**
 * List fixture names for a version.
 * @param {number} version
 * @param {{kind?: 'valid'|'breaking', prefix?: string}} [options]
 * @returns {string[]} file names without the .json extension, sorted
 */
export function listFixtures(version, options = {}) {
  const { kind = 'valid', prefix } = options;
  const dir = directoryFor(version, kind);
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .filter((name) => !prefix || name.startsWith(prefix))
    .sort();
}

/**
 * Read a fixture. Returns a fresh deep copy each call so a test that mutates
 * a payload cannot leak into the next one.
 * @param {number} version
 * @param {string} name - fixture name without the .json extension
 * @param {{kind?: 'valid'|'breaking'}} [options]
 * @returns {object}
 */
export function loadFixture(version, name, options = {}) {
  const kind = options.kind ?? 'valid';
  const file = path.join(directoryFor(version, kind), `${name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Fixture "${name}" not found for contract v${version} (${kind}). ` +
        `Available: ${listFixtures(version, { kind }).join(', ')}`,
    );
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadAll(version, options) {
  return listFixtures(version, options).map((name) => ({
    name,
    payload: loadFixture(version, name, options),
  }));
}

/**
 * All valid transfer fixtures for a version.
 * @param {number} version
 * @returns {Array<{name: string, payload: object}>}
 */
export function loadTransferFixtures(version) {
  return loadAll(version, { prefix: 'transfer.' });
}

/**
 * All valid quote fixtures for a version.
 * @param {number} version
 * @returns {Array<{name: string, payload: object}>}
 */
export function loadQuoteFixtures(version) {
  return loadAll(version, { prefix: 'quote.' });
}

/**
 * All fixtures that must be rejected, for a version.
 * @param {number} version
 * @returns {Array<{name: string, payload: object}>}
 */
export function loadBreakingFixtures(version) {
  return loadAll(version, { kind: 'breaking' });
}

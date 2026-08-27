// A tiny, dependency-free schema validator for API responses.
//
// The point is not general-purpose validation — it is *actionable failure*.
// When a provider renames a field or changes a type, the app should say
// exactly which field moved and what it moved to, instead of quietly
// rendering a zero. Every issue carries the path, what was expected and what
// actually arrived, and `formatIssues` turns that into a diff a reviewer can
// act on without opening a debugger.
//
// Compatibility policy, applied by `validate`:
//   * unknown fields are ALLOWED and preserved — providers may add fields
//     without breaking a released client (forward compatible);
//   * missing, retyped or renamed declared fields are BREAKING and reported.

import {
  compareDecimal,
  describeValue,
  parseDecimal,
} from '../../utils/money.js';

/** @typedef {{path: string, code: string, expected: string, received: string, hint?: string}} ContractIssue */

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

/**
 * Normalise a field name so that `send_amount`, `sendAmount` and `SendAmount`
 * collapse to the same key. Used to detect renames rather than reporting them
 * as an unrelated "missing field".
 * @param {string} key
 * @returns {string}
 */
function normalizeKey(key) {
  return key.toLowerCase().replace(/[_\-\s]/g, '');
}

const VALIDATORS = {
  string(value, field) {
    if (typeof value !== 'string') {
      return { expected: 'string', received: describeValue(value) };
    }
    if (field.pattern && !field.pattern.test(value)) {
      return {
        expected: `string matching ${field.pattern}`,
        received: describeValue(value),
      };
    }
    if (field.minLength && value.length < field.minLength) {
      return {
        expected: `string of at least ${field.minLength} characters`,
        received: describeValue(value),
      };
    }
    return { value };
  },

  currency(value) {
    if (typeof value !== 'string' || !CURRENCY_PATTERN.test(value)) {
      return {
        expected: 'ISO 4217 currency code (three uppercase letters)',
        received: describeValue(value),
      };
    }
    return { value };
  },

  // Money and rates. Normalised to a canonical decimal *string* so no float
  // ever enters the app from a response body.
  decimal(value, field) {
    const parsed = parseDecimal(value);
    if (!parsed.ok) {
      return {
        expected: 'decimal (number or numeric string)',
        received: describeValue(value),
        hint: parsed.error,
      };
    }
    if (field.min != null && compareDecimal(parsed.value, field.min) < 0) {
      return {
        expected: `decimal >= ${field.min}`,
        received: describeValue(value),
      };
    }
    return { value: parsed.value };
  },

  integer(value) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      return {
        expected: 'safe integer',
        received: describeValue(value),
      };
    }
    return { value };
  },

  boolean(value) {
    if (typeof value !== 'boolean') {
      return { expected: 'boolean', received: describeValue(value) };
    }
    return { value };
  },

  timestamp(value) {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
      return {
        expected: 'ISO 8601 timestamp string',
        received: describeValue(value),
      };
    }
    return { value };
  },

  enum(value, field) {
    if (typeof value !== 'string') {
      return {
        expected: `one of [${field.values.join(', ')}]`,
        received: describeValue(value),
      };
    }
    if (field.values.includes(value)) return { value };

    const aliased = field.aliases?.[value];
    if (aliased && field.values.includes(aliased)) {
      // A known legacy spelling: accept it and normalise, no issue raised.
      return { value: aliased };
    }
    return {
      expected: `one of [${field.values.join(', ')}]`,
      received: describeValue(value),
      hint: field.aliases
        ? `accepted legacy spellings: ${Object.keys(field.aliases).join(', ')}`
        : undefined,
    };
  },
};

/**
 * Declare a versioned contract.
 * @param {{name: string, version: number, fields: object}} definition
 * @returns {{name: string, version: number, fields: object, id: string}}
 */
export function defineContract(definition) {
  const { name, version, fields } = definition;
  for (const [key, field] of Object.entries(fields)) {
    if (!VALIDATORS[field.type]) {
      throw new Error(
        `Contract ${name} v${version}: field "${key}" uses unknown type "${field.type}"`,
      );
    }
  }
  return { ...definition, id: `${name} v${version}` };
}

/**
 * Validate a raw response object against a contract.
 *
 * @param {object} contract - from defineContract()
 * @param {unknown} raw - the value straight off the wire
 * @returns {{ok: boolean, value: object|null, issues: ContractIssue[]}}
 */
export function validate(contract, raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      value: null,
      issues: [
        {
          path: '(root)',
          code: 'not_an_object',
          expected: 'object',
          received: describeValue(raw),
        },
      ],
    };
  }

  const issues = [];
  const result = {};
  const declaredKeys = Object.keys(contract.fields);
  const unknownKeys = Object.keys(raw).filter((k) => !declaredKeys.includes(k));

  // Index unknown keys by normalised name so a rename is reported as a rename.
  const unknownByNormalized = new Map();
  for (const key of unknownKeys) {
    unknownByNormalized.set(normalizeKey(key), key);
  }

  for (const [key, field] of Object.entries(contract.fields)) {
    const present = Object.prototype.hasOwnProperty.call(raw, key);
    const value = raw[key];

    if (
      !present ||
      value === undefined ||
      (value === null && !field.nullable)
    ) {
      if (field.required) {
        const renamedFrom = unknownByNormalized.get(normalizeKey(key));
        if (renamedFrom) {
          issues.push({
            path: key,
            code: 'renamed_field',
            expected: `field "${key}"`,
            received: `field "${renamedFrom}" carrying ${describeValue(raw[renamedFrom])}`,
            hint: `"${renamedFrom}" looks like a renamed "${key}" — map it in the adapter or bump the contract version`,
          });
        } else {
          issues.push({
            path: key,
            code: 'missing_field',
            expected: `required ${field.type}`,
            received: present ? describeValue(value) : 'absent',
          });
        }
        continue;
      }
      if (field.default !== undefined) result[key] = field.default;
      else if (value === null && field.nullable) result[key] = null;
      continue;
    }

    if (value === null && field.nullable) {
      result[key] = null;
      continue;
    }

    const outcome = VALIDATORS[field.type](value, field);
    if (outcome.expected) {
      issues.push({
        path: key,
        code: field.type === 'enum' ? 'invalid_enum' : 'wrong_type',
        expected: outcome.expected,
        received: outcome.received,
        hint: outcome.hint,
      });
      continue;
    }
    result[key] = outcome.value;
  }

  // Unknown fields are forward-compatible: keep them, never fail on them.
  for (const key of unknownKeys) {
    if (!(key in result)) result[key] = raw[key];
  }

  return {
    ok: issues.length === 0,
    value: issues.length ? null : result,
    issues,
  };
}

/**
 * Render issues as a multi-line, actionable diff.
 * @param {object} contract
 * @param {ContractIssue[]} issues
 * @param {{source?: string}} [options] - where the payload came from
 * @returns {string}
 */
export function formatIssues(contract, issues, options = {}) {
  const source = options.source ? ` from ${options.source}` : '';
  const lines = [
    `${contract.id} contract mismatch${source} (${issues.length} ${
      issues.length === 1 ? 'issue' : 'issues'
    }):`,
  ];
  for (const issue of issues) {
    lines.push(
      `  - ${issue.path}: expected ${issue.expected}, received ${issue.received}`,
    );
    if (issue.hint) lines.push(`      hint: ${issue.hint}`);
  }
  lines.push(
    `  Fix: update the adapter for ${contract.id} and the matching fixtures in test/fixtures/v${contract.version}/ together, or bump the contract version.`,
  );
  return lines.join('\n');
}

/**
 * Thrown when a payload cannot be trusted. The message is the actionable diff;
 * `issues` is the structured form for tests and telemetry.
 */
export class ContractViolationError extends Error {
  /**
   * @param {object} contract
   * @param {ContractIssue[]} issues
   * @param {{source?: string}} [options]
   */
  constructor(contract, issues, options = {}) {
    super(formatIssues(contract, issues, options));
    this.name = 'ContractViolationError';
    this.contract = contract.id;
    this.version = contract.version;
    this.issues = issues;
    this.source = options.source;
  }
}

/**
 * Validate or throw a ContractViolationError carrying the diff.
 * @param {object} contract
 * @param {unknown} raw
 * @param {{source?: string}} [options]
 * @returns {object} the normalised value
 */
export function parseOrThrow(contract, raw, options = {}) {
  const outcome = validate(contract, raw);
  if (!outcome.ok)
    throw new ContractViolationError(contract, outcome.issues, options);
  return outcome.value;
}

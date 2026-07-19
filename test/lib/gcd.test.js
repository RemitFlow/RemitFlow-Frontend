'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import gcd from '../../src/lib/numbers/gcd.js';

test('gcd returns the expected result', () => {
  assert.deepStrictEqual(gcd(12, 8), 4);
});

'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import safeDivide from '../../src/lib/numbers/safeDivide.js';

test('safeDivide returns the expected result', () => {
  assert.deepStrictEqual(safeDivide(10, 2), 5);
});

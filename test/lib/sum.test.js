'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import sum from '../../src/lib/numbers/sum.js';

test('sum returns the expected result', () => {
  assert.deepStrictEqual(sum([1, 2, 3]), 6);
});

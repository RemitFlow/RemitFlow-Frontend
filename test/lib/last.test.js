'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import last from '../../src/lib/arrays/last.js';

test('last returns the expected result', () => {
  assert.deepStrictEqual(last([1, 2, 3]), 3);
});

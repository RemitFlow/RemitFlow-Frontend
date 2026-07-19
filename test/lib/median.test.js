'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import median from '../../src/lib/numbers/median.js';

test('median returns the expected result', () => {
  assert.deepStrictEqual(median([3, 1, 2]), 2);
});

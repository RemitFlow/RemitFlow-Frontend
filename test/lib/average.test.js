'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import average from '../../src/lib/numbers/average.js';

test('average returns the expected result', () => {
  assert.deepStrictEqual(average([1, 2, 3]), 2);
});

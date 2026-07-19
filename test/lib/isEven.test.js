'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import isEven from '../../src/lib/numbers/isEven.js';

test('isEven returns the expected result', () => {
  assert.deepStrictEqual(isEven(4), true);
});

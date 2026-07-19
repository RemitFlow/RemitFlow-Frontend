'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import percentOf from '../../src/lib/numbers/percentOf.js';

test('percentOf returns the expected result', () => {
  assert.deepStrictEqual(percentOf(50, 200), 25);
});

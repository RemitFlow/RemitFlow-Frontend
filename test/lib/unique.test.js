'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import unique from '../../src/lib/arrays/unique.js';

test('unique returns the expected result', () => {
  assert.deepStrictEqual(unique([1, 1, 2]), [1, 2]);
});

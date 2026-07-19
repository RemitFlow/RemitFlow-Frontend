'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import compact from '../../src/lib/arrays/compact.js';

test('compact returns the expected result', () => {
  assert.deepStrictEqual(compact([0, 1, 2, null, 3]), [1, 2, 3]);
});

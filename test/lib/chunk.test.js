'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import chunk from '../../src/lib/arrays/chunk.js';

test('chunk returns the expected result', () => {
  assert.deepStrictEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});

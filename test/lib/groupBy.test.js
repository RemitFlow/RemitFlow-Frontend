'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import groupBy from '../../src/lib/arrays/groupBy.js';

test('groupBy returns the expected result', () => {
  assert.deepStrictEqual(groupBy([1, 2, 3], (x) => x % 2), { '0': [2], '1': [1, 3] });
});

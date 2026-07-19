'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import sortBy from '../../src/lib/arrays/sortBy.js';

test('sortBy returns the expected result', () => {
  assert.deepStrictEqual(sortBy([{ v: 3 }, { v: 1 }], (o) => o.v), [{ v: 1 }, { v: 3 }]);
});

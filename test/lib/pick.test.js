'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import pick from '../../src/lib/objects/pick.js';

test('pick returns the expected result', () => {
  assert.deepStrictEqual(pick({ a: 1, b: 2 }, ['a']), { a: 1 });
});

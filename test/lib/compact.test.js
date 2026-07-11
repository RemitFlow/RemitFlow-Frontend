'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const compact = require('../../src/lib/arrays/compact.js');

test('compact returns the expected result', () => {
  assert.deepStrictEqual(compact([0, 1, 2, null, 3]), [1, 2, 3]);
});

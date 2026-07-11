'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const chunk = require('../../src/lib/arrays/chunk.js');

test('chunk returns the expected result', () => {
  assert.deepStrictEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});

'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const safeDivide = require('../../src/lib/numbers/safeDivide.js');

test('safeDivide returns the expected result', () => {
  assert.deepStrictEqual(safeDivide(10, 2), 5);
});

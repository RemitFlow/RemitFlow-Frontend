'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const isEven = require('../../src/lib/numbers/isEven.js');

test('isEven returns the expected result', () => {
  assert.deepStrictEqual(isEven(4), true);
});

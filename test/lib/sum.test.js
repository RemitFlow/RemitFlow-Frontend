'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const sum = require('../../src/lib/numbers/sum.js');

test('sum returns the expected result', () => {
  assert.deepStrictEqual(sum([1, 2, 3]), 6);
});

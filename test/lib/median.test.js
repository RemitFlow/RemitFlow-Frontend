'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const median = require('../../src/lib/numbers/median.js');

test('median returns the expected result', () => {
  assert.deepStrictEqual(median([3, 1, 2]), 2);
});

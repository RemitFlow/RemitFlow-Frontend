'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const roundTo = require('../../src/lib/numbers/roundTo.js');

test('roundTo returns the expected result', () => {
  assert.deepStrictEqual(roundTo(3.14159, 2), 3.14);
});

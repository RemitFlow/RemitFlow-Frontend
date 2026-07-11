'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const gcd = require('../../src/lib/numbers/gcd.js');

test('gcd returns the expected result', () => {
  assert.deepStrictEqual(gcd(12, 8), 4);
});

'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const reverseString = require('../../src/lib/strings/reverseString.js');

test('reverseString returns the expected result', () => {
  assert.deepStrictEqual(reverseString('abc'), 'cba');
});

'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const countWords = require('../../src/lib/strings/countWords.js');

test('countWords returns the expected result', () => {
  assert.deepStrictEqual(countWords('a b c'), 3);
});

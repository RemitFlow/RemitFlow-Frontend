'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const capitalize = require('../../src/lib/strings/capitalize.js');

test('capitalize returns the expected result', () => {
  assert.deepStrictEqual(capitalize('abc'), 'Abc');
});

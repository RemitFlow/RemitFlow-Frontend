'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const titleCase = require('../../src/lib/strings/titleCase.js');

test('titleCase returns the expected result', () => {
  assert.deepStrictEqual(titleCase('hi there'), 'Hi There');
});

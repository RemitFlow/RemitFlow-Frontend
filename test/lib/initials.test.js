'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const initials = require('../../src/lib/strings/initials.js');

test('initials returns the expected result', () => {
  assert.deepStrictEqual(initials('John Doe'), 'JD');
});

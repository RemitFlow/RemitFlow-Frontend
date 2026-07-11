'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const truncate = require('../../src/lib/strings/truncate.js');

test('truncate returns the expected result', () => {
  assert.deepStrictEqual(truncate('hello', 3), 'hel…');
});

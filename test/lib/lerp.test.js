'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const lerp = require('../../src/lib/numbers/lerp.js');

test('lerp returns the expected result', () => {
  assert.deepStrictEqual(lerp(0, 10, 0.5), 5);
});

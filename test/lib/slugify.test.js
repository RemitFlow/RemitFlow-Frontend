'use strict';

const assert = require('node:assert');
const { test } = require('node:test');

const slugify = require('../../src/lib/strings/slugify.js');

test('slugify returns the expected result', () => {
  assert.deepStrictEqual(slugify('Hi There!'), 'hi-there');
});

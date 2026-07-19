'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import slugify from '../../src/lib/strings/slugify.js';

test('slugify returns the expected result', () => {
  assert.deepStrictEqual(slugify('Hi There!'), 'hi-there');
});

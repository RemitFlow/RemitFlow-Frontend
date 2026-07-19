'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import reverseString from '../../src/lib/strings/reverseString.js';

test('reverseString returns the expected result', () => {
  assert.deepStrictEqual(reverseString('abc'), 'cba');
});

'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import isBlank from '../../src/lib/strings/isBlank.js';

test('isBlank returns the expected result', () => {
  assert.deepStrictEqual(isBlank('   '), true);
});

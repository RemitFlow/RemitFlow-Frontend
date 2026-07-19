'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import capitalize from '../../src/lib/strings/capitalize.js';

test('capitalize returns the expected result', () => {
  assert.deepStrictEqual(capitalize('abc'), 'Abc');
});

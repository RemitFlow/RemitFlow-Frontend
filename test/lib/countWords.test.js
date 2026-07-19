'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import countWords from '../../src/lib/strings/countWords.js';

test('countWords returns the expected result', () => {
  assert.deepStrictEqual(countWords('a b c'), 3);
});

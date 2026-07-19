'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import truncate from '../../src/lib/strings/truncate.js';

test('truncate returns the expected result', () => {
  assert.deepStrictEqual(truncate('hello', 3), 'hel…');
});

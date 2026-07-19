'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import clamp from '../../src/lib/numbers/clamp.js';

test('clamp returns the expected result', () => {
  assert.deepStrictEqual(clamp(5, 0, 3), 3);
});

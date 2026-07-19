'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import lerp from '../../src/lib/numbers/lerp.js';

test('lerp returns the expected result', () => {
  assert.deepStrictEqual(lerp(0, 10, 0.5), 5);
});

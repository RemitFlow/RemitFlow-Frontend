'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import roundTo from '../../src/lib/numbers/roundTo.js';

test('roundTo returns the expected result', () => {
  assert.deepStrictEqual(roundTo(3.14159, 2), 3.14);
});

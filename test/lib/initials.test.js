'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import initials from '../../src/lib/strings/initials.js';

test('initials returns the expected result', () => {
  assert.deepStrictEqual(initials('John Doe'), 'JD');
});

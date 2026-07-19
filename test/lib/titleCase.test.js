'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import titleCase from '../../src/lib/strings/titleCase.js';

test('titleCase returns the expected result', () => {
  assert.deepStrictEqual(titleCase('hi there'), 'Hi There');
});

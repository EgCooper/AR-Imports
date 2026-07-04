import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isValidEmail,
  normalizeEmail,
  toNonNegativeNumber,
  toPositiveNumber,
  validatePassword,
} from '../src/utils/validators.js';

describe('validators', () => {
  it('normalizeEmail y isValidEmail', () => {
    assert.equal(normalizeEmail('  Ana@Test.COM '), 'ana@test.com');
    assert.equal(isValidEmail('ana@test.com'), true);
    assert.equal(isValidEmail('invalid'), false);
  });

  it('validatePassword exige longitud mínima y complejidad', () => {
    assert.equal(validatePassword('1234567').ok, false);
    assert.equal(validatePassword('12345678').ok, false);
    assert.equal(validatePassword('abcd1234').ok, true);
  });

  it('toPositiveNumber y toNonNegativeNumber', () => {
    assert.equal(toPositiveNumber('10.5'), 10.5);
    assert.equal(toPositiveNumber(0), null);
    assert.equal(toNonNegativeNumber('0'), 0);
    assert.equal(toNonNegativeNumber(-1), null);
  });
});

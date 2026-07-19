import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { escapeRegex, MAX_SEARCH_LENGTH, sanitizeSearchTerm } from '../src/utils/search.js';

describe('search utils', () => {
  it('escapeRegex escapa metacaracteres', () => {
    assert.equal(escapeRegex('a.+*?^${}()|[]\\b'), 'a\\.\\+\\*\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\b');
  });

  it('sanitizeSearchTerm recorta longitud y escapa', () => {
    assert.equal(sanitizeSearchTerm('  '), null);
    assert.equal(sanitizeSearchTerm(null), null);
    assert.equal(sanitizeSearchTerm('juan.'), 'juan\\.');
    const long = 'x'.repeat(MAX_SEARCH_LENGTH + 20);
    assert.equal(sanitizeSearchTerm(long).length, MAX_SEARCH_LENGTH);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPaginationMeta, parsePagination } from '../src/utils/pagination.js';

describe('pagination', () => {
  it('parsePagination aplica defaults y límites', () => {
    const parsed = parsePagination({ page: '2', limit: '999' }, { defaultLimit: 50, maxLimit: 200 });
    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 200);
    assert.equal(parsed.skip, 200);
  });

  it('buildPaginationMeta calcula totalPages', () => {
    assert.deepEqual(buildPaginationMeta(1, 50, 120), {
      page: 1,
      limit: 50,
      total: 120,
      totalPages: 3,
    });
  });
});

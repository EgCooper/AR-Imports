import { describe, expect, it } from 'vitest';

import {
  parseClientsResponse,
  parseQuotesResponse,
  summariesMapFromClients,
} from './paymentSummaries.js';

describe('paymentSummaries', () => {
  it('parseClientsResponse acepta array plano', () => {
    const result = parseClientsResponse([{ id: '1' }]);
    expect(result.items).toHaveLength(1);
    expect(result.pagination).toBeNull();
  });

  it('parseClientsResponse acepta respuesta paginada', () => {
    const result = parseClientsResponse({
      items: [{ id: '2' }],
      pagination: { page: 1, total: 1 },
    });
    expect(result.items[0].id).toBe('2');
    expect(result.pagination.page).toBe(1);
  });

  it('parseQuotesResponse delega en parseClientsResponse', () => {
    expect(parseQuotesResponse([{ id: '3' }]).items[0].id).toBe('3');
  });

  it('summariesMapFromClients construye resumen por id', () => {
    const map = summariesMapFromClients([
      {
        id: 'abc',
        costoTotalPactado: 1000,
        resumenFinanciero: { costoTotalPactado: 1000, totalPagado: 200, saldoPendiente: 800 },
      },
    ]);
    expect(map.abc.resumenFinanciero.saldoPendiente).toBe(800);
    expect(map.abc.historialAbonos).toEqual([]);
  });
});

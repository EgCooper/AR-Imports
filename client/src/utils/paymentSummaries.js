/**
 * Normaliza la respuesta de GET /clients (array plano o paginado).
 * @param {unknown} data
 * @returns {{ items: object[], pagination: object|null }}
 */
export function parseClientsResponse(data) {
  if (Array.isArray(data)) {
    return { items: data, pagination: null };
  }
  if (data?.items && Array.isArray(data.items)) {
    return { items: data.items, pagination: data.pagination ?? null };
  }
  return { items: [], pagination: null };
}

/**
 * Normaliza la respuesta de GET /quotes (array plano o paginado).
 * @param {unknown} data
 * @returns {{ items: object[], pagination: object|null }}
 */
export function parseQuotesResponse(data) {
  return parseClientsResponse(data);
}

/**
 * Construye el mapa de resúmenes financieros a partir de clientes con resumenFinanciero embebido.
 * @param {object[]} clients
 */
export function summariesMapFromClients(clients) {
  return Object.fromEntries(
    clients.map((client) => [
      client.id,
      {
        resumenFinanciero: client.resumenFinanciero ?? {
          costoTotalPactado: client.costoTotalPactado ?? 0,
          totalPagado: 0,
          saldoPendiente: client.costoTotalPactado ?? 0,
        },
        historialAbonos: [],
      },
    ])
  );
}

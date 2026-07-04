/**
 * Calcula el resumen financiero de un cliente.
 * @param {number} costoTotalPactado
 * @param {number} totalPagado
 */
export function buildResumenFinanciero(costoTotalPactado, totalPagado) {
  const costo = costoTotalPactado ?? 0;
  const pagado = totalPagado ?? 0;
  return {
    costoTotalPactado: costo,
    totalPagado: pagado,
    saldoPendiente: costo - pagado,
  };
}

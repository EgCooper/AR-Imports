/** Etiquetas de estado logístico — píldoras de color (Manual de Marca ARR-Imports). */
const BADGE_BASE = 'inline-flex rounded-full px-3 py-1 text-xs font-medium text-white';

export const ESTADO_CONFIG = {
  USA: { label: 'USA', badge: `${BADGE_BASE} bg-slate-500` },
  CHILE: { label: 'Chile', badge: `${BADGE_BASE} bg-orange-500` },
  ADUANA_BOLIVIA: { label: 'Aduana', badge: `${BADGE_BASE} bg-blue-500` },
  BOLIVIA: { label: 'Bolivia', badge: `${BADGE_BASE} bg-purple-500` },
  TALLER: { label: 'Taller', badge: `${BADGE_BASE} bg-emerald-600` },
};

export const ESTADOS_OPCIONES = [
  { value: 'USA', label: 'USA' },
  { value: 'CHILE', label: 'Chile' },
  { value: 'ADUANA_BOLIVIA', label: 'Aduana' },
  { value: 'BOLIVIA', label: 'Bolivia' },
  { value: 'TALLER', label: 'Taller' },
];

export const CONCEPTOS_PAGO = [
  { value: 'PAGO_INICIAL', label: 'Pago inicial' },
  { value: 'RESERVA', label: 'Reserva' },
  { value: 'ABONO_SUBASTA', label: 'Abono para subasta' },
  { value: 'PAGO_FLETE', label: 'Pago flete' },
  { value: 'TRANSPORTE_PAGO', label: 'Transporte pago' },
  { value: 'TRAMITES', label: 'Trámites' },
  { value: 'REPARACIONES', label: 'Reparaciones' },
  { value: 'REPUESTOS', label: 'Repuestos' },
  { value: 'OTRO', label: 'Otro' },
];

export const METODOS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'QR', label: 'QR' },
  { value: 'OTRO', label: 'Otro' },
];

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function formatDate(dateString) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function getConceptLabel(concepto) {
  return CONCEPTOS_PAGO.find((c) => c.value === concepto)?.label ?? concepto;
}

export function getVehicleLabel(client, quoteData) {
  if (client?.vehiculo) return client.vehiculo;
  const cot = quoteData?.cotizacion;
  if (cot?.datosVehiculo) return cot.datosVehiculo;
  if (cot?.marca) return `${cot.marca} ${cot.modelo ?? ''}`.trim();
  return `VIN ${client?.vin ?? '—'} · Lote ${client?.lote ?? '—'}`;
}

import { formatMoney } from '../components/clients/clientConstants.js';

const BOB_FORMATTER = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'BOB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * @param {number} usdAmount
 * @param {number} tipoCambioBob
 */
export function convertUsdToBob(usdAmount, tipoCambioBob) {
  const usd = Number(usdAmount) || 0;
  const rate = Number(tipoCambioBob) || 0;
  return usd * rate;
}

/**
 * @param {number} bobAmount
 */
export function formatBob(bobAmount) {
  return BOB_FORMATTER.format(bobAmount ?? 0);
}

/**
 * @param {number} usdAmount
 * @param {number} tipoCambioBob
 */
export function formatDualMoney(usdAmount, tipoCambioBob) {
  const usd = formatMoney(usdAmount);
  if (!tipoCambioBob) return usd;
  const bob = formatBob(convertUsdToBob(usdAmount, tipoCambioBob));
  return `${usd} (${bob})`;
}

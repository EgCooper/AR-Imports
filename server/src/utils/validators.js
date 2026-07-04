const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const METODOS_PAGO_VALIDOS = ['EFECTIVO', 'QR', 'OTRO'];

/**
 * Normaliza un email (trim + minúsculas).
 * @param {unknown} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

/**
 * Política mínima: 8+ caracteres, al menos una letra y un número.
 * @param {unknown} password
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) || !/\d/.test(password)) {
    return {
      ok: false,
      message: 'La contraseña debe incluir al menos una letra y un número',
    };
  }
  return { ok: true };
}

/**
 * Número finito >= 0 (acepta number o string numérico).
 * @param {unknown} value
 * @returns {number|null}
 */
export function toNonNegativeNumber(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Número finito > 0.
 * @param {unknown} value
 * @returns {number|null}
 */
export function toPositiveNumber(value) {
  const n = toNonNegativeNumber(value);
  if (n === null || n <= 0) return null;
  return n;
}

/**
 * Solo permite URLs de uploads propios del servidor.
 * @param {unknown} url
 * @returns {boolean}
 */
export function isAllowedUploadUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;

  const trimmed = url.trim();
  if (
    trimmed.startsWith('/uploads/vehicles/') ||
    trimmed.startsWith('/uploads/comprobantes/')
  ) {
    return !trimmed.includes('..');
  }

  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname;
    return (
      (path.startsWith('/uploads/vehicles/') || path.startsWith('/uploads/comprobantes/')) &&
      !path.includes('..')
    );
  } catch {
    return false;
  }
}

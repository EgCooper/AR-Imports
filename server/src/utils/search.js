/** Longitud máxima de términos de búsqueda libres. */
export const MAX_SEARCH_LENGTH = 64;

/**
 * Escapa metacaracteres de expresión regular para uso seguro en MongoDB $regex.
 * @param {string} value
 * @returns {string}
 */
export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normaliza un término de búsqueda: trim, tope de longitud y escape de regex.
 * @param {unknown} raw
 * @returns {string|null} Término listo para $regex, o null si vacío/inválido
 */
export function sanitizeSearchTerm(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const limited = trimmed.slice(0, MAX_SEARCH_LENGTH);
  return escapeRegex(limited);
}

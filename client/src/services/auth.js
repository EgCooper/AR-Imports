/**
 * Normaliza URLs de uploads a rutas relativas (misma origin → cookies httpOnly).
 * @param {string|null|undefined} url
 * @returns {string|null|undefined}
 */
export function resolveUploadUrl(url) {
  if (!url) return url;

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.pathname.includes('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    if (url.startsWith('/uploads/')) return url;
  }

  return url;
}

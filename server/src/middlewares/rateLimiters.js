import rateLimit from 'express-rate-limit';

/** Límite para login y registro (anti fuerza bruta). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
});

/** Límite para subida de archivos (más estricto; se combina con cuota en bytes). */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas subidas. Intenta de nuevo en unos minutos.' },
});

/** Límite para listados/búsquedas (mitiga DoS vía $regex). */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas búsquedas. Intenta de nuevo en un momento.' },
});

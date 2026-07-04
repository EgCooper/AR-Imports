import { findById } from '../models/userModel.js';
import { sendError } from '../utils/apiResponse.js';
import { getAccessTokenFromRequest } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Protege rutas privadas: JWT en cookie httpOnly (o Bearer legacy) + usuario activo en BD.
 */
export async function protect(req, res, next) {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    return sendError(res, 401, 'Acceso denegado. No autorizado');
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await findById(decoded.userId);

    if (!user) {
      return sendError(res, 401, 'Acceso denegado. No autorizado');
    }

    req.user = {
      userId: decoded.userId,
      nombre: user.nombre,
      email: user.email,
    };
    return next();
  } catch {
    return sendError(res, 401, 'Acceso denegado. No autorizado');
  }
}

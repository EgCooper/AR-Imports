import bcrypt from 'bcryptjs';

import {
  consumeRefreshJti,
  revokeRefreshJti,
  storeRefreshJti,
} from '../models/refreshTokenModel.js';
import { findByEmail, findById, createUser } from '../models/userModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { clearAuthCookies, getRefreshTokenFromRequest, setAuthCookies } from '../utils/cookies.js';
import { formatUser, toIdString } from '../utils/formatters.js';
import {
  generateJti,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import {
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from '../utils/validators.js';

function mapUserResponse(user) {
  return formatUser(user);
}

async function issueAuthSession(res, userId) {
  const jti = generateJti();
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId, jti);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await storeRefreshJti(jti, userId, expiresAt);
  setAuthCookies(res, accessToken, refreshToken);

  return accessToken;
}

/**
 * Registra un nuevo importador en el sistema.
 */
export async function register(req, res) {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return sendError(res, 400, 'Nombre, email y contraseña son requeridos');
    }

    const nombreTrim = String(nombre).trim();
    if (!nombreTrim) {
      return sendError(res, 400, 'El nombre es requerido');
    }

    const emailNorm = normalizeEmail(email);
    if (!isValidEmail(emailNorm)) {
      return sendError(res, 400, 'El email no es válido');
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      return sendError(res, 400, passwordCheck.message);
    }

    const usuarioExistente = await findByEmail(emailNorm);
    if (usuarioExistente) {
      return sendError(res, 409, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = {
      nombre: nombreTrim,
      email: emailNorm,
      passwordHash,
      fechaCreacion: new Date(),
    };

    const resultado = await createUser(nuevoUsuario);

    return sendSuccess(res, 201, {
      id: toIdString(resultado.insertedId),
      nombre: nombreTrim,
      email: emailNorm,
      fechaCreacion: nuevoUsuario.fechaCreacion,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 409, 'El email ya está registrado');
    }
    return sendError(res, 500, 'Error al registrar usuario');
  }
}

/**
 * Autentica e inicia sesión con cookies httpOnly.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email y contraseña son requeridos');
    }

    const emailNorm = normalizeEmail(email);
    if (!isValidEmail(emailNorm)) {
      return sendError(res, 401, 'Credenciales inválidas');
    }

    const usuario = await findByEmail(emailNorm);
    if (!usuario) {
      return sendError(res, 401, 'Credenciales inválidas');
    }

    const contraseñaValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!contraseñaValida) {
      return sendError(res, 401, 'Credenciales inválidas');
    }

    const userId = usuario._id.toString();
    await issueAuthSession(res, userId);

    return sendSuccess(res, 200, {
      usuario: mapUserResponse(usuario),
    });
  } catch {
    return sendError(res, 500, 'Error al iniciar sesión');
  }
}

/**
 * Renueva el access token usando el refresh token (rotación).
 */
export async function refreshSession(req, res) {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    clearAuthCookies(res);
    return sendError(res, 401, 'Sesión expirada');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const stored = await consumeRefreshJti(decoded.jti);

    if (!stored) {
      clearAuthCookies(res);
      return sendError(res, 401, 'Sesión expirada');
    }

    const user = await findById(decoded.userId);
    if (!user) {
      clearAuthCookies(res);
      return sendError(res, 401, 'Sesión expirada');
    }

    await issueAuthSession(res, decoded.userId);
    return sendSuccess(res, 200, { message: 'Sesión renovada' });
  } catch {
    clearAuthCookies(res);
    return sendError(res, 401, 'Sesión expirada');
  }
}

/**
 * Cierra sesión y revoca el refresh token.
 */
export async function logout(req, res) {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await revokeRefreshJti(decoded.jti);
    } catch {
      // token inválido o expirado
    }
  }

  clearAuthCookies(res);
  return sendSuccess(res, 200, { message: 'Sesión cerrada' });
}

/**
 * Devuelve el usuario autenticado actual.
 */
export async function getMe(req, res) {
  const user = await findById(req.user.userId);
  if (!user) {
    clearAuthCookies(res);
    return sendError(res, 401, 'Acceso denegado. No autorizado');
  }

  return sendSuccess(res, 200, mapUserResponse(user));
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { findByEmail, createUser } from '../models/userModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

/**
 * Registra un nuevo importador en el sistema.
 * @param {import('express').Request} req - Petición HTTP con nombre, email y password en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function register(req, res) {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return sendError(res, 400, 'Nombre, email y contraseña son requeridos');
    }

    const usuarioExistente = await findByEmail(email);
    if (usuarioExistente) {
      return sendError(res, 409, 'El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const nuevoUsuario = {
      nombre,
      email,
      passwordHash,
      fechaCreacion: new Date(),
    };

    const resultado = await createUser(nuevoUsuario);

    return sendSuccess(res, 201, {
      id: resultado.insertedId,
      nombre,
      email,
      fechaCreacion: nuevoUsuario.fechaCreacion,
    });
  } catch (error) {
    return sendError(res, 500, 'Error al registrar usuario');
  }
}

/**
 * Autentica un importador y genera un token JWT de acceso.
 * @param {import('express').Request} req - Petición HTTP con email y password en el body.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email y contraseña son requeridos');
    }

    const usuario = await findByEmail(email);
    if (!usuario) {
      return sendError(res, 401, 'Credenciales inválidas');
    }

    const contraseñaValida = await bcrypt.compare(password, usuario.passwordHash);
    if (!contraseñaValida) {
      return sendError(res, 401, 'Credenciales inválidas');
    }

    const token = jwt.sign(
      { userId: usuario._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return sendSuccess(res, 200, {
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });
  } catch (error) {
    return sendError(res, 500, 'Error al iniciar sesión');
  }
}

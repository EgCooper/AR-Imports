import fs from 'fs/promises';
import path from 'path';

import {
  COMPROBANTE_UPLOAD_DIR,
  MAX_UPLOAD_FILE_SIZE,
  VEHICLE_UPLOAD_DIR,
} from './uploadMiddleware.js';
import { sendError } from '../utils/apiResponse.js';

const WINDOW_MS = 15 * 60 * 1000;

/** Cuota acumulada por usuario autenticado (bytes / ventana). Default ~40 MB. */
const PER_USER_BYTE_QUOTA = Number(process.env.UPLOAD_USER_QUOTA_BYTES || 40 * 1024 * 1024);

/** Tope global de tamaño del directorio uploads (bytes). Default ~2 GB. */
const GLOBAL_DISK_QUOTA = Number(process.env.UPLOAD_GLOBAL_QUOTA_BYTES || 2 * 1024 * 1024 * 1024);

/** @type {Map<string, { bytes: number, resetAt: number }>} */
const userUsage = new Map();

async function directorySizeBytes(dir) {
  let total = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await directorySizeBytes(full);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const stat = await fs.stat(full);
      total += stat.size;
    } catch {
      // ignore
    }
  }

  return total;
}

function getUserBucket(userId) {
  const now = Date.now();
  const existing = userUsage.get(userId);
  if (!existing || existing.resetAt <= now) {
    const bucket = { bytes: 0, resetAt: now + WINDOW_MS };
    userUsage.set(userId, bucket);
    return bucket;
  }
  return existing;
}

/**
 * Registra bytes consumidos tras una subida exitosa.
 * @param {string} userId
 * @param {number} bytes
 */
export function recordUploadUsage(userId, bytes) {
  if (!userId || !Number.isFinite(bytes) || bytes <= 0) return;
  const bucket = getUserBucket(userId);
  bucket.bytes += bytes;
}

/**
 * Middleware: rechaza subidas si se excede cuota por usuario o disco global.
 */
export async function enforceUploadQuota(req, res, next) {
  try {
    const userId = req.user?.userId ? String(req.user.userId) : 'anonymous';
    const bucket = getUserBucket(userId);

    if (bucket.bytes >= PER_USER_BYTE_QUOTA) {
      return sendError(
        res,
        429,
        'Cuota de subida alcanzada. Intenta de nuevo en unos minutos.'
      );
    }

    const remainingUser = PER_USER_BYTE_QUOTA - bucket.bytes;
    if (remainingUser < MAX_UPLOAD_FILE_SIZE) {
      return sendError(
        res,
        429,
        'Cuota de subida casi agotada. Intenta de nuevo en unos minutos.'
      );
    }

    const [vehiclesSize, comprobantesSize] = await Promise.all([
      directorySizeBytes(VEHICLE_UPLOAD_DIR),
      directorySizeBytes(COMPROBANTE_UPLOAD_DIR),
    ]);
    const usedDisk = vehiclesSize + comprobantesSize;

    if (usedDisk + MAX_UPLOAD_FILE_SIZE > GLOBAL_DISK_QUOTA) {
      return sendError(res, 507, 'Almacenamiento de archivos saturado. Contacta al administrador.');
    }

    req.uploadQuota = {
      userId,
      remainingUser,
      usedDisk,
      globalQuota: GLOBAL_DISK_QUOTA,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Suma tamaños de archivos en la request y los registra en la cuota del usuario.
 * @param {import('express').Request} req
 */
export function trackUploadedBytes(req) {
  const userId = req.user?.userId ? String(req.user.userId) : null;
  if (!userId) return;

  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  const bytes = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  recordUploadUsage(userId, bytes);
}

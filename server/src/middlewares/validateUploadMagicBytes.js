import fs from 'fs';

import { imageSize } from 'image-size';

import { removeUploadedFiles } from './uploadMiddleware.js';
import { sendError } from '../utils/apiResponse.js';

const ALLOWED_TYPES = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_IMAGE_DIMENSION = Number(process.env.UPLOAD_MAX_IMAGE_DIMENSION || 10_000);
const HEADER_READ_BYTES = 64 * 1024;

function matchesSignature(buffer, signature) {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/**
 * Validación rápida de magic bytes (JPEG, PNG, GIF, WEBP).
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function hasImageMagicBytes(buffer) {
  if (matchesSignature(buffer, [0xff, 0xd8, 0xff])) return true;
  if (matchesSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true;
  if (matchesSignature(buffer, [0x47, 0x49, 0x46, 0x38])) return true;
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return true;
  }
  return false;
}

/**
 * Valida que el archivo sea una imagen decodificable (cabeceras + dimensiones).
 * @param {string} filePath
 * @returns {{ ok: true, type: string, width: number, height: number } | { ok: false }}
 */
export function inspectImageFile(filePath) {
  let buffer;
  try {
    const fd = fs.openSync(filePath, 'r');
    buffer = Buffer.alloc(HEADER_READ_BYTES);
    const bytesRead = fs.readSync(fd, buffer, 0, HEADER_READ_BYTES, 0);
    fs.closeSync(fd);
    buffer = buffer.subarray(0, bytesRead);
  } catch {
    return { ok: false };
  }

  if (!hasImageMagicBytes(buffer)) {
    return { ok: false };
  }

  try {
    const info = imageSize(buffer);
    const type = String(info.type || '').toLowerCase();
    const width = Number(info.width) || 0;
    const height = Number(info.height) || 0;

    if (!ALLOWED_TYPES.has(type) || width < 1 || height < 1) {
      return { ok: false };
    }

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      return { ok: false };
    }

    return { ok: true, type, width, height };
  } catch {
    return { ok: false };
  }
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function isValidImageFile(filePath) {
  return inspectImageFile(filePath).ok;
}

/**
 * Middleware post-multer: rechaza archivos cuyo contenido no es una imagen real.
 */
export function validateUploadMagicBytes(req, res, next) {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) return next();

  for (const file of files) {
    const result = inspectImageFile(file.path);
    if (!result.ok) {
      removeUploadedFiles(req);
      return sendError(
        res,
        400,
        'El archivo no es una imagen válida (JPEG, PNG, WEBP o GIF) o excede dimensiones permitidas'
      );
    }
  }

  return next();
}

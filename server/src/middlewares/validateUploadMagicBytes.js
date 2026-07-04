import fs from 'fs';

import { sendError } from '../utils/apiResponse.js';

function matchesSignature(buffer, signature) {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

/**
 * Valida magic bytes de imágenes permitidas (JPEG, PNG, GIF, WEBP).
 * @param {string} filePath
 * @returns {boolean}
 */
export function isValidImageFile(filePath) {
  let buffer;
  try {
    const fd = fs.openSync(filePath, 'r');
    buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
  } catch {
    return false;
  }

  if (matchesSignature(buffer, [0xff, 0xd8, 0xff])) return true;
  if (matchesSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true;
  if (matchesSignature(buffer, [0x47, 0x49, 0x46, 0x38])) return true;
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return true;
  }

  return false;
}

function removeFiles(files) {
  for (const file of files) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // ignore
    }
  }
}

/**
 * Middleware post-multer: rechaza archivos cuyo contenido no coincide con una imagen válida.
 */
export function validateUploadMagicBytes(req, res, next) {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) return next();

  for (const file of files) {
    if (!isValidImageFile(file.path)) {
      removeFiles(files);
      return sendError(res, 400, 'El archivo no es una imagen válida (JPEG, PNG, WEBP o GIF)');
    }
  }

  return next();
}

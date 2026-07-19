import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const VEHICLE_UPLOAD_DIR = path.join(__dirname, '../../uploads/vehicles');
export const COMPROBANTE_UPLOAD_DIR = path.join(__dirname, '../../uploads/comprobantes');

fs.mkdirSync(VEHICLE_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(COMPROBANTE_UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** Tamaño máximo por archivo (8 MB). */
export const MAX_UPLOAD_FILE_SIZE = 8 * 1024 * 1024;
/** Máximo de fotos de vehículo por request. */
export const MAX_VEHICLE_FILES = 5;

const MULTIPART_LIMITS = {
  fileSize: MAX_UPLOAD_FILE_SIZE,
  files: MAX_VEHICLE_FILES,
  /** Mitiga CVE-2026-5079: profundidad de nombres a[b][c]... */
  fieldNestingDepth: 1,
  fields: 20,
  parts: 30,
  fieldNameSize: 100,
  fieldSize: 16 * 1024,
};

function createFilename(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${safeExt}`);
}

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF'));
}

/**
 * Elimina archivos escritos por multer (parciales o rechazados).
 * @param {import('express').Request} req
 */
export function removeUploadedFiles(req) {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  for (const file of files) {
    if (!file?.path) continue;
    try {
      fs.unlinkSync(file.path);
    } catch {
      // ignore
    }
  }
}

/**
 * Ejecuta un middleware multer y limpia disco si la carga aborta o falla (CVE-2026-5038).
 * @param {import('express').RequestHandler} multerMiddleware
 * @returns {import('express').RequestHandler}
 */
export function runUpload(multerMiddleware) {
  return (req, res, next) => {
    let settled = false;

    const cleanupIfNeeded = () => {
      if (settled) return;
      removeUploadedFiles(req);
    };

    const onAborted = () => cleanupIfNeeded();
    req.on('aborted', onAborted);

    multerMiddleware(req, res, (err) => {
      req.off('aborted', onAborted);

      if (err) {
        cleanupIfNeeded();
        return next(err);
      }

      settled = true;
      return next();
    });
  };
}

const vehicleStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VEHICLE_UPLOAD_DIR),
  filename: createFilename,
});

const comprobanteStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, COMPROBANTE_UPLOAD_DIR),
  filename: createFilename,
});

export const uploadVehiclePhotos = multer({
  storage: vehicleStorage,
  limits: { ...MULTIPART_LIMITS, files: MAX_VEHICLE_FILES },
  fileFilter,
}).array('fotos', MAX_VEHICLE_FILES);

export const uploadComprobantePhoto = multer({
  storage: comprobanteStorage,
  limits: { ...MULTIPART_LIMITS, files: 1 },
  fileFilter,
}).single('comprobante');

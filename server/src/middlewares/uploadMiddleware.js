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
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter,
}).array('fotos', 10);

export const uploadComprobantePhoto = multer({
  storage: comprobanteStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter,
}).single('comprobante');

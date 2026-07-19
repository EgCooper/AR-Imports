import { Router } from 'express';

import { getClientPhotos, uploadComprobanteFile, uploadPhotoRecord, uploadVehicleFiles } from '../controllers/photoController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadLimiter } from '../middlewares/rateLimiters.js';
import { enforceUploadQuota, trackUploadedBytes } from '../middlewares/uploadQuota.js';
import {
  MAX_UPLOAD_FILE_SIZE,
  MAX_VEHICLE_FILES,
  runUpload,
  uploadComprobantePhoto,
  uploadVehiclePhotos,
} from '../middlewares/uploadMiddleware.js';
import { validateUploadMagicBytes } from '../middlewares/validateUploadMagicBytes.js';

const router = Router();

const runVehicleUpload = runUpload(uploadVehiclePhotos);
const runComprobanteUpload = runUpload(uploadComprobantePhoto);

function handleUploadErrors(err, req, res, next) {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: `Cada imagen debe pesar menos de ${Math.round(MAX_UPLOAD_FILE_SIZE / (1024 * 1024))} MB`,
    });
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: `Máximo ${MAX_VEHICLE_FILES} imágenes por subida`,
    });
  }
  if (err.code === 'LIMIT_PART_COUNT' || err.code === 'LIMIT_FIELD_COUNT') {
    return res.status(400).json({ success: false, message: 'Formulario multipart demasiado grande' });
  }
  if (err.code === 'LIMIT_FIELD_NESTING_DEPTH' || err.message?.includes('nesting')) {
    return res.status(400).json({ success: false, message: 'Campos multipart inválidos' });
  }
  return res.status(400).json({ success: false, message: err.message || 'Error al subir imágenes' });
}

router.post('/upload', protect, uploadLimiter, enforceUploadQuota, (req, res, next) => {
  runVehicleUpload(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    return validateUploadMagicBytes(req, res, () => {
      trackUploadedBytes(req);
      return uploadVehicleFiles(req, res);
    });
  });
});

router.post('/upload/comprobante', protect, uploadLimiter, enforceUploadQuota, (req, res, next) => {
  runComprobanteUpload(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    return validateUploadMagicBytes(req, res, () => {
      trackUploadedBytes(req);
      return uploadComprobanteFile(req, res);
    });
  });
});

router.post('/', protect, uploadPhotoRecord);
router.get('/:clientId', protect, getClientPhotos);

export default router;

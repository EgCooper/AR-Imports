import { Router } from 'express';

import { getClientPhotos, uploadComprobanteFile, uploadPhotoRecord, uploadVehicleFiles } from '../controllers/photoController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadLimiter } from '../middlewares/rateLimiters.js';
import { validateUploadMagicBytes } from '../middlewares/validateUploadMagicBytes.js';
import { uploadComprobantePhoto, uploadVehiclePhotos } from '../middlewares/uploadMiddleware.js';

const router = Router();

function handleUploadErrors(err, req, res, next) {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Cada imagen debe pesar menos de 8 MB' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Máximo 10 imágenes por subida' });
  }
  return res.status(400).json({ success: false, message: err.message || 'Error al subir imágenes' });
}

router.post('/upload', protect, uploadLimiter, (req, res, next) => {
  uploadVehiclePhotos(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    return validateUploadMagicBytes(req, res, () => uploadVehicleFiles(req, res));
  });
});

router.post('/upload/comprobante', protect, uploadLimiter, (req, res, next) => {
  uploadComprobantePhoto(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    return validateUploadMagicBytes(req, res, () => uploadComprobanteFile(req, res));
  });
});

router.post('/', protect, uploadPhotoRecord);
router.get('/:clientId', protect, getClientPhotos);

export default router;

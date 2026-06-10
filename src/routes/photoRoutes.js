import { Router } from 'express';

import { getClientPhotos, uploadPhotoRecord } from '../controllers/photoController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', protect, uploadPhotoRecord);
router.get('/:clientId', getClientPhotos);

export default router;

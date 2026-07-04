import { Router } from 'express';

import { getSettings, patchExchangeRate } from '../controllers/settingsController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', protect, getSettings);
router.patch('/exchange-rate', protect, patchExchangeRate);

export default router;

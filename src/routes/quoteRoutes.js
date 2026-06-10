import { Router } from 'express';

import { getQuoteByClient, saveQuote } from '../controllers/quoteController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/:clientId', protect, saveQuote);
router.get('/:clientId', protect, getQuoteByClient);

export default router;

import { Router } from 'express';

import {
  createQuoteHandler,
  getQuoteByClient,
  getQuoteById,
  listQuotes,
  saveQuote,
  updateQuoteItem,
} from '../controllers/quoteController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', protect, listQuotes);
router.post('/', protect, createQuoteHandler);
router.get('/item/:quoteId', protect, getQuoteById);
router.put('/item/:quoteId', protect, updateQuoteItem);
router.post('/:clientId', protect, saveQuote);
router.get('/:clientId', protect, getQuoteByClient);

export default router;

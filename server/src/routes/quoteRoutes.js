import { Router } from 'express';

import {
  archiveQuote,
  convertQuoteToClient,
  createQuoteHandler,
  getQuoteByClient,
  getQuoteById,
  linkQuoteToClientHandler,
  listQuotes,
  restoreQuote,
  saveQuote,
  unlinkQuoteHandler,
  updateQuoteItem,
} from '../controllers/quoteController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/', protect, listQuotes);
router.post('/', protect, createQuoteHandler);
router.get('/item/:quoteId', protect, getQuoteById);
router.put('/item/:quoteId', protect, updateQuoteItem);
router.patch('/item/:quoteId/link', protect, linkQuoteToClientHandler);
router.patch('/item/:quoteId/unlink', protect, unlinkQuoteHandler);
router.post('/item/:quoteId/convert-to-client', protect, convertQuoteToClient);
router.post('/item/:quoteId/archive', protect, archiveQuote);
router.post('/item/:quoteId/restore', protect, restoreQuote);
router.post('/:clientId', protect, saveQuote);
router.get('/:clientId', protect, getQuoteByClient);

export default router;

import { Router } from 'express';

import {
  exportPaymentsCsv,
  getBatchFinancialSummaries,
  getClientFinancialSummary,
  registerClientPayment,
  updateClientPayment,
  voidClientPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', protect, registerClientPayment);
router.get('/export.csv', protect, exportPaymentsCsv);
router.post('/summaries/batch', protect, getBatchFinancialSummaries);
router.get('/summary/:clientId', protect, getClientFinancialSummary);
router.patch('/:paymentId', protect, updateClientPayment);
router.post('/:paymentId/void', protect, voidClientPayment);

export default router;

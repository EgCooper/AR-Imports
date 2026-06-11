import { Router } from 'express';

import {
  getClientFinancialSummary,
  registerClientPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', protect, registerClientPayment);
router.get('/summary/:clientId', protect, getClientFinancialSummary);

export default router;

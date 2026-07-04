import { Router } from 'express';

import {
  exportPaymentsReportCsv,
  exportQuotesReportCsv,
  getSummaryReport,
} from '../controllers/reportsController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/summary', protect, getSummaryReport);
router.get('/quotes/export.csv', protect, exportQuotesReportCsv);
router.get('/payments/export.csv', protect, exportPaymentsReportCsv);

export default router;

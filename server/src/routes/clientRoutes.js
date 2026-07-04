import { Router } from 'express';

import {
  archiveClient,
  exportClientsCsv,
  getAllClients,
  getClientById,
  getClientTimeline,
  registerClient,
  restoreClient,
  updateClient,
  updateStatus,
} from '../controllers/clientController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', protect, registerClient);
router.get('/export.csv', protect, exportClientsCsv);
router.get('/', protect, getAllClients);
router.get('/:id/timeline', protect, getClientTimeline);
router.get('/:id', protect, getClientById);
router.patch('/:id', protect, updateClient);
router.patch('/:id/status', protect, updateStatus);
router.post('/:id/archive', protect, archiveClient);
router.post('/:id/restore', protect, restoreClient);

export default router;

import { Router } from 'express';

import {
  getAllClients,
  getClientById,
  registerClient,
  updateStatus,
} from '../controllers/clientController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', protect, registerClient);
router.get('/', protect, getAllClients);
router.get('/:id', protect, getClientById);
router.patch('/:id/status', protect, updateStatus);

export default router;

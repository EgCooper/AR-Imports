import { Router } from 'express';

import { isRegisterAllowed } from '../config/env.js';
import { getMe, login, logout, refreshSession, register } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiters.js';
import { sendError } from '../utils/apiResponse.js';

const router = Router();

router.post('/register', authLimiter, (req, res) => {
  if (!isRegisterAllowed()) {
    return sendError(res, 403, 'El registro de usuarios está deshabilitado');
  }
  return register(req, res);
});

router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refreshSession);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;

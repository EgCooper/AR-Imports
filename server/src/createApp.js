import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import path from 'path';
import { fileURLToPath } from 'url';

import { getCorsOrigins } from './config/env.js';
import { pingDB } from './config/mongo.js';
import { isAppReady, setAppReady } from './config/readiness.js';
import { protect } from './middlewares/authMiddleware.js';
import { protectFile } from './middlewares/protectFile.js';
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import quoteRoutes from './routes/quoteRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { sendError, sendSuccess } from './utils/apiResponse.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Crea y configura la aplicación Express sin iniciar el servidor HTTP.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();
  const corsOrigins = getCorsOrigins();

  app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/health' || req.url === '/api/ready',
      },
    })
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    })
  );

  app.use(cookieParser());
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origen no permitido por CORS'));
      },
      credentials: true,
    })
  );

  app.use(
    '/uploads/vehicles',
    protectFile,
    express.static(path.join(__dirname, '../uploads/vehicles'), {
      fallthrough: false,
    })
  );
  app.use(
    '/uploads/comprobantes',
    protectFile,
    express.static(path.join(__dirname, '../uploads/comprobantes'), {
      fallthrough: false,
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/quotes', quoteRoutes);
  app.use('/api/photos', photoRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/reports', reportsRoutes);

  app.get('/api/health', (req, res) => {
    sendSuccess(res, 200, {
      status: 'ok',
      message: 'Servidor operativo',
    });
  });

  app.get('/api/ready', async (req, res) => {
    if (!isAppReady()) {
      return sendError(res, 503, 'Aplicación iniciando o MongoDB no disponible');
    }

    const dbOk = await pingDB();
    if (!dbOk) {
      setAppReady(false);
      return sendError(res, 503, 'MongoDB no responde');
    }

    return sendSuccess(res, 200, {
      status: 'ready',
      message: 'Aplicación lista para recibir tráfico',
    });
  });

  app.get('/api/db-health', protect, async (req, res) => {
    try {
      const dbOk = await pingDB();
      if (!dbOk) {
        return sendError(res, 503, 'No se pudo conectar a MongoDB');
      }

      sendSuccess(res, 200, {
        message: 'Conexión a MongoDB exitosa',
        ok: true,
      });
    } catch {
      sendError(res, 503, 'No se pudo conectar a MongoDB');
    }
  });

  app.use('/api', (req, res) => {
    sendError(res, 404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  });

  app.use((err, req, res, _next) => {
    if (err?.message === 'Origen no permitido por CORS') {
      return sendError(res, 403, 'Origen no permitido por CORS');
    }

    req.log?.error({ err }, 'Error no controlado');
    return sendError(res, 500, 'Error interno del servidor');
  });

  return app;
}

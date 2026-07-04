import { assertEnv } from './config/env.js';
import { ensureAppIndexes } from './config/indexes.js';
import { closeDB, connectDB } from './config/mongo.js';
import { setAppReady } from './config/readiness.js';
import { createApp } from './createApp.js';
import { logger } from './utils/logger.js';

assertEnv();

const PORT = process.env.PORT || 3001;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10_000);

const app = createApp();

const server = app.listen(PORT, async () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Servidor HTTP iniciado');

  try {
    await connectDB();
    await ensureAppIndexes();
    setAppReady(true);
    logger.info('Aplicación lista (readiness=true)');
  } catch (error) {
    setAppReady(false);
    logger.error({ err: error }, 'Arranque incompleto: MongoDB o índices no disponibles');
  }
});

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  setAppReady(false);

  logger.info({ signal }, 'Iniciando apagado graceful');

  const forceExitTimer = setTimeout(() => {
    logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Apagado forzado por timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  server.close(async (closeError) => {
    if (closeError) {
      logger.error({ err: closeError }, 'Error al cerrar servidor HTTP');
    }

    try {
      await closeDB();
      clearTimeout(forceExitTimer);
      logger.info('Apagado graceful completado');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error durante apagado graceful');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT');
});

export default app;

import { assertEnv } from './config/env.js';
import { ensureAppIndexes } from './config/indexes.js';
import { closeDB, connectDB } from './config/mongo.js';
import { setAppReady } from './config/readiness.js';
import { createApp } from './createApp.js';
import { cleanupOrphanUploads } from './jobs/cleanupOrphanUploads.js';
import { logger } from './utils/logger.js';

assertEnv();

const PORT = process.env.PORT || 3001;
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10_000);
const ORPHAN_CLEANUP_INTERVAL_MS = Number(
  process.env.UPLOAD_ORPHAN_CLEANUP_INTERVAL_MS || 6 * 60 * 60 * 1000
);

const app = createApp();

let orphanCleanupTimer;

async function runOrphanCleanup() {
  try {
    const result = await cleanupOrphanUploads();
    logger.info(
      {
        totalOrphans: result.totalOrphans,
        totalDeleted: result.totalDeleted,
        minAgeHours: result.minAgeHours,
      },
      'Limpieza programada de uploads huérfanos'
    );
  } catch (error) {
    logger.warn({ err: error }, 'Falló la limpieza programada de uploads');
  }
}

const server = app.listen(PORT, async () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'Servidor HTTP iniciado');

  try {
    await connectDB();
    await ensureAppIndexes();
    setAppReady(true);
    logger.info('Aplicación lista (readiness=true)');

    // Primera pasada tras arrancar; luego periódica (mitiga CVE-2026-5038 / disco lleno).
    orphanCleanupTimer = setInterval(runOrphanCleanup, ORPHAN_CLEANUP_INTERVAL_MS);
    orphanCleanupTimer.unref?.();
    setTimeout(runOrphanCleanup, 30_000).unref?.();
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

  if (orphanCleanupTimer) {
    clearInterval(orphanCleanupTimer);
  }

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

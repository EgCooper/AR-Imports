import 'dotenv/config';

import { connectDB, closeDB } from '../config/mongo.js';
import { cleanupOrphanUploads } from '../jobs/cleanupOrphanUploads.js';
import { logger } from '../utils/logger.js';

const dryRun = process.argv.includes('--dry-run');

try {
  await connectDB();
  const result = await cleanupOrphanUploads({ dryRun });
  logger.info(result, dryRun ? 'Simulación de limpieza completada' : 'Limpieza de uploads completada');
  process.exitCode = 0;
} catch (error) {
  logger.error({ err: error }, 'Error en limpieza de uploads');
  process.exitCode = 1;
} finally {
  await closeDB();
}

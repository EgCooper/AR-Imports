import fs from 'fs/promises';
import path from 'path';

import { getDB } from '../config/db.js';
import {
  COMPROBANTE_UPLOAD_DIR,
  VEHICLE_UPLOAD_DIR,
} from '../middlewares/uploadMiddleware.js';
import { logger } from '../utils/logger.js';

const COLLECTIONS = {
  clients: 'Cliente',
  photos: 'fotos_logistica',
  payments: 'Pago',
};

/**
 * Normaliza una URL de upload a pathname relativo (/uploads/...).
 * @param {string|null|undefined} rawUrl
 * @returns {string|null}
 */
export function normalizeUploadPath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/uploads/')) return trimmed;

  try {
    const pathname = new URL(trimmed).pathname;
    return pathname.startsWith('/uploads/') ? pathname : null;
  } catch {
    return null;
  }
}

/**
 * Recopila todas las rutas de archivos referenciadas en la base de datos.
 * @returns {Promise<Set<string>>}
 */
export async function collectReferencedUploadPaths() {
  const db = await getDB();
  const referenced = new Set();

  const [clients, photos, payments] = await Promise.all([
    db
      .collection(COLLECTIONS.clients)
      .find({ fotoAutoUrl: { $ne: null } }, { projection: { fotoAutoUrl: 1 } })
      .toArray(),
    db.collection(COLLECTIONS.photos).find({}, { projection: { fotoUrl: 1 } }).toArray(),
    db
      .collection(COLLECTIONS.payments)
      .find({ comprobanteUrl: { $ne: null } }, { projection: { comprobanteUrl: 1 } })
      .toArray(),
  ]);

  for (const doc of clients) {
    const uploadPath = normalizeUploadPath(doc.fotoAutoUrl);
    if (uploadPath) referenced.add(uploadPath);
  }

  for (const doc of photos) {
    const uploadPath = normalizeUploadPath(doc.fotoUrl);
    if (uploadPath) referenced.add(uploadPath);
  }

  for (const doc of payments) {
    const uploadPath = normalizeUploadPath(doc.comprobanteUrl);
    if (uploadPath) referenced.add(uploadPath);
  }

  return referenced;
}

/**
 * @param {string} dir
 * @param {'vehicles'|'comprobantes'} kind
 * @param {Set<string>} referenced
 * @param {{ dryRun: boolean, minAgeMs: number }} options
 */
async function scanDirectory(dir, kind, referenced, { dryRun, minAgeMs }) {
  const prefix = `/uploads/${kind}/`;
  const result = { scanned: 0, orphans: 0, deleted: 0, skippedRecent: 0, errors: 0 };

  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch (error) {
    if (error.code === 'ENOENT') return result;
    throw error;
  }

  const now = Date.now();

  for (const filename of entries) {
    result.scanned += 1;
    const uploadPath = `${prefix}${filename}`;
    if (referenced.has(uploadPath)) continue;

    const filePath = path.join(dir, filename);
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      result.errors += 1;
      continue;
    }

    if (!stat.isFile()) continue;

    if (now - stat.mtimeMs < minAgeMs) {
      result.skippedRecent += 1;
      continue;
    }

    result.orphans += 1;

    if (dryRun) continue;

    try {
      await fs.unlink(filePath);
      result.deleted += 1;
    } catch (error) {
      result.errors += 1;
      logger.warn({ err: error, filePath }, 'No se pudo eliminar archivo huérfano');
    }
  }

  return result;
}

/**
 * Elimina archivos en uploads/ que no están referenciados en MongoDB.
 * @param {{ dryRun?: boolean, minAgeMs?: number }} [options]
 * @returns {Promise<object>}
 */
export async function cleanupOrphanUploads(options = {}) {
  const dryRun = options.dryRun ?? false;
  const minAgeMs =
    options.minAgeMs ??
    Number(process.env.UPLOAD_ORPHAN_MIN_AGE_HOURS || 1) * 60 * 60 * 1000;

  const referenced = await collectReferencedUploadPaths();

  const [vehicles, comprobantes] = await Promise.all([
    scanDirectory(VEHICLE_UPLOAD_DIR, 'vehicles', referenced, { dryRun, minAgeMs }),
    scanDirectory(COMPROBANTE_UPLOAD_DIR, 'comprobantes', referenced, { dryRun, minAgeMs }),
  ]);

  return {
    dryRun,
    minAgeHours: minAgeMs / (60 * 60 * 1000),
    referencedCount: referenced.size,
    vehicles,
    comprobantes,
    totalOrphans: vehicles.orphans + comprobantes.orphans,
    totalDeleted: vehicles.deleted + comprobantes.deleted,
  };
}

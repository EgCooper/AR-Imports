import { getDB } from '../config/db.js';

const SETTINGS_ID = 'app_settings';
const COLLECTION_NAME = 'configuracion';

async function getSettingsCollection() {
  const db = await getDB();
  return db.collection(COLLECTION_NAME);
}

const DEFAULT_EXCHANGE_RATE = 6.96;

/**
 * @returns {Promise<{ tipoCambioBob: number, fechaActualizacion: Date|null }>}
 */
export async function getAppSettings() {
  const collection = await getSettingsCollection();
  const doc = await collection.findOne({ _id: SETTINGS_ID });

  return {
    tipoCambioBob: doc?.tipoCambioBob ?? DEFAULT_EXCHANGE_RATE,
    fechaActualizacion: doc?.fechaActualizacion ?? null,
  };
}

/**
 * @param {number} tipoCambioBob
 */
export async function updateExchangeRate(tipoCambioBob) {
  const collection = await getSettingsCollection();

  await collection.updateOne(
    { _id: SETTINGS_ID },
    {
      $set: {
        tipoCambioBob,
        fechaActualizacion: new Date(),
      },
    },
    { upsert: true }
  );

  return getAppSettings();
}

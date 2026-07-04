import { ensureClientIndexes } from '../models/clientModel.js';
import { ensurePaymentIndexes } from '../models/paymentModel.js';
import { ensurePhotoIndexes } from '../models/photoModel.js';
import { ensureQuoteIndexes } from '../models/quoteModel.js';
import { ensureRefreshTokenIndexes } from '../models/refreshTokenModel.js';
import { ensureUserIndexes } from '../models/userModel.js';

/**
 * Garantiza todos los índices de la aplicación al iniciar el servidor.
 */
export async function ensureAppIndexes() {
  await Promise.all([
    ensureUserIndexes(),
    ensureRefreshTokenIndexes(),
    ensureClientIndexes(),
    ensurePaymentIndexes(),
    ensureQuoteIndexes(),
    ensurePhotoIndexes(),
  ]);
}

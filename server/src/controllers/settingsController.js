import { getAppSettings, updateExchangeRate } from '../models/settingsModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';
import { toPositiveNumber } from '../utils/validators.js';

export async function getSettings(req, res) {
  try {
    const settings = await getAppSettings();
    return sendSuccess(res, 200, settings);
  } catch {
    return sendError(res, 500, 'No se pudo obtener la configuración');
  }
}

export async function patchExchangeRate(req, res) {
  try {
    const rate = toPositiveNumber(req.body.tipoCambioBob);
    if (rate === null) {
      return sendError(res, 400, 'tipoCambioBob debe ser un número positivo');
    }

    const settings = await updateExchangeRate(rate);
    return sendSuccess(res, 200, settings);
  } catch {
    return sendError(res, 500, 'No se pudo actualizar el tipo de cambio');
  }
}

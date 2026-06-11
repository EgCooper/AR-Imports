import { getDashboardStats } from '../models/dashboardModel.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

/**
 * Devuelve métricas y pagos recientes para el dashboard principal.
 * @param {import('express').Request} req - Petición HTTP.
 * @param {import('express').Response} res - Respuesta HTTP.
 * @returns {Promise<import('express').Response>}
 */
export async function getDashboard(req, res) {
  try {
    const data = await getDashboardStats();
    return sendSuccess(res, 200, data);
  } catch (error) {
    return sendError(res, 500, 'Error al cargar datos del dashboard');
  }
}

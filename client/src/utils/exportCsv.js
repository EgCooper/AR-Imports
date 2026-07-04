import api from '../services/api.js';

/**
 * Descarga un archivo CSV desde un endpoint autenticado.
 * @param {string} path - Ruta relativa bajo /api
 * @param {string} filename
 * @param {object} [params]
 */
export async function downloadCsvExport(path, filename, params = {}) {
  const response = await api.get(path, {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

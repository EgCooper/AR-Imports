import api from './api.js';

/**
 * Sube imágenes del vehículo al servidor.
 * @param {File[]} files - Archivos de imagen seleccionados.
 * @returns {Promise<string[]>} URLs públicas de las imágenes subidas.
 */
export async function uploadVehiclePhotos(files) {
  if (!files?.length) return [];

  const formData = new FormData();
  files.forEach((file) => formData.append('fotos', file));

  const response = await api.post('/photos/upload', formData);

  if (!response.data.success) {
    throw new Error(response.data.message || 'No se pudieron subir las imágenes');
  }

  return response.data.data.urls ?? [];
}

/**
 * Asocia URLs de fotos al historial logístico de un cliente.
 */
export async function linkPhotosToClient(clientId, urls, estadoAuto) {
  if (!urls?.length) return;

  await Promise.allSettled(
    urls.map((fotoUrl) =>
      api.post('/photos', {
        clienteId: clientId,
        estadoAlMomento: estadoAuto,
        fotoUrl,
      })
    )
  );
}

/**
 * Sube la captura de comprobante de depósito.
 * @param {File} file - Imagen del comprobante.
 * @returns {Promise<string>} URL pública del comprobante.
 */
export async function uploadComprobantePhoto(file) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('comprobante', file);

  const response = await api.post('/photos/upload/comprobante', formData);

  if (!response.data.success) {
    throw new Error(response.data.message || 'No se pudo subir el comprobante');
  }

  return response.data.data.url ?? null;
}

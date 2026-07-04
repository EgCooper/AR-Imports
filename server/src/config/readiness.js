/** @type {boolean} */
let appReady = false;

/**
 * Indica si la aplicación completó el arranque (MongoDB + índices).
 * @returns {boolean}
 */
export function isAppReady() {
  return appReady;
}

/**
 * Marca la aplicación como lista o no lista para recibir tráfico.
 * @param {boolean} value
 */
export function setAppReady(value) {
  appReady = value;
}

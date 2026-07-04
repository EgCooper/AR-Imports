import dotenv from 'dotenv';

dotenv.config();

const WEAK_SECRETS = new Set([
  'tu_clave_secreta_aqui',
  'secret',
  'changeme',
  'jwt_secret',
  'password',
  '123456',
  '123456789',
]);

/**
 * Valida variables de entorno críticas al arrancar el servidor.
 * Termina el proceso si JWT_SECRET o DATABASE_URL no son seguros/válidos.
 */
export function assertEnv() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32 || WEAK_SECRETS.has(secret.toLowerCase())) {
    console.error(
      'JWT_SECRET inválido: define un secreto de al menos 32 caracteres (no uses el valor de ejemplo).'
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL no está definida en las variables de entorno');
    process.exit(1);
  }
}

/**
 * Orígenes permitidos para CORS (lista separada por comas).
 * @returns {string[]}
 */
export function getCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Registro público solo si ALLOW_REGISTER=true, o en desarrollo si no se define.
 * En producción queda deshabilitado por defecto.
 * @returns {boolean}
 */
export function isRegisterAllowed() {
  if (process.env.ALLOW_REGISTER === 'true') return true;
  if (process.env.ALLOW_REGISTER === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

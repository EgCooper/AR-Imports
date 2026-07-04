import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

export function generateJti() {
  return crypto.randomBytes(16).toString('hex');
}

export function signAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES, algorithm: 'HS256' }
  );
}

export function signRefreshToken(userId, jti) {
  return jwt.sign(
    { userId, type: 'refresh', jti },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES, algorithm: 'HS256' }
  );
}

export function verifyAccessToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded;
}

export function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (decoded.type !== 'refresh' || !decoded.jti) throw new Error('Invalid token type');
  return decoded;
}

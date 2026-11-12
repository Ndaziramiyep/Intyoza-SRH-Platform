import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Sign an access token for a user.
 * Payload is minimal — no PII, only what the API needs to authorize.
 */
export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      isAnonymous: user.isAnonymous,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * Verify a token. Throws on invalid/expired.
 * Caller decides what to do with the error.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
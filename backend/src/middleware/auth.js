import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/db.js';

// STRICT: Blocks the request if no valid token is provided
export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', requestId: req.id },
      });
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', requestId: req.id },
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required', requestId: req.id },
    });
  }
}

// OPTIONAL: Attaches user if token exists, but allows guests if it doesn't
export async function authOptional(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme === 'Bearer' && token) {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch {
    // If token is invalid, just proceed as a guest
    next();
  }
}
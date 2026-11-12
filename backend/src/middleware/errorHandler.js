import { config } from '../config.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  req.log?.error?.({ err }, 'Unhandled error');

  const body = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'Internal server error' : err.message,
      requestId: req.id,
    },
  };

  if (config.isDev && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}
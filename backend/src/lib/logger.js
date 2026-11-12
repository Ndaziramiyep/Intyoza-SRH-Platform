import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      // Placeholders — will expand as features add sensitive fields
      'req.headers.authorization',
      'req.body.password',
      'req.body.message',
      '*.message',
    ],
    censor: '[REDACTED]',
  },
});
import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/db.js';

const app = createApp();
const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.env, version: config.version },
    'Intyoza API started'
  );
});

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('HTTP server and DB connection closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
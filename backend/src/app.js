import express from 'express';
import swaggerUi from 'swagger-ui-express';
import passport from 'passport';
import { requestContext } from './middleware/requestContext.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { config } from './config.js';
import { swaggerSpec, swaggerUiOptions } from './swagger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(express.json({ limit: '100kb' }));

  // Initialize Passport
  app.use(passport.initialize());

  // ROBUST CORS CONFIGURATION

  app.use((req, res, next) => {
    // Dynamically allow the requesting origin (Vercel, localhost, etc.)
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with, x-client-id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests (browsers send OPTIONS before POST/PATCH requests)
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: config.version,
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

  app.use('/api/v1', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
import { Router } from 'express';
import { authRouter } from './auth.js';
import { aiRouter } from './ai.js';
import { learningRouter } from './learning.js';
import { adminRouter } from './admin.js';
import { mythsRouter } from './myths.js';
import { facilitiesRouter } from './facilities.js';
import { communityRouter } from './community.js';
import { professionalsRouter } from './professionals.js';

export const apiRouter = Router();

apiRouter.get('/', (req, res) => {
  res.json({ name: 'Intyoza API', version: 'v1' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/learning', learningRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/myths', mythsRouter);
apiRouter.use('/facilities', facilitiesRouter);
apiRouter.use('/community', communityRouter);
apiRouter.use('/professionals', professionalsRouter);
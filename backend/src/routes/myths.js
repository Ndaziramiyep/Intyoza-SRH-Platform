import { Router } from 'express';
import { getMyths } from '../services/myths.service.js';

export const mythsRouter = Router();

// get myths
mythsRouter.get('/', async (req, res, next) => {
  try {
    const { language } = req.query;
    const myths = await getMyths({ language });
    res.json({ myths });
  } catch (err) {
    next(err);
  }
});
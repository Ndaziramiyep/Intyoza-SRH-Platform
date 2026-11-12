import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { createReferral, getUserReferrals } from '../services/professionals.service.js';

export const professionalsRouter = Router();

professionalsRouter.use(authRequired);

// creating professionalreferals
professionalsRouter.post('/referrals', async (req, res, next) => {
  try {
    const { contactMethod, topic } = req.body || {};
    const referral = await createReferral({
      userId: req.user.id,
      contactMethod,
      topic,
    });
    res.status(201).json({ referral });
  } catch (err) {
    next(err);
  }
});

// get professionals referrals
professionalsRouter.get('/referrals', async (req, res, next) => {
  try {
    const referrals = await getUserReferrals(req.user.id);
    res.json({ referrals });
  } catch (err) {
    next(err);
  }
});
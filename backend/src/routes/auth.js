import { Router } from 'express';
import passport from '../lib/passport.js';
import { authRequired } from '../middleware/auth.js';
import { signAccessToken } from '../lib/jwt.js';
import {
  registerUser,
  loginUser,
  updateProfile,
} from '../services/auth.service.js';
import { config } from '../config.js';

export const authRouter = Router();

// Standard Auth
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, ageBand, gender, district, language } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email and password are required', requestId: req.id } });
    }
    const result = await registerUser({ email, password, ageBand, gender, district, language });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Email and password are required', requestId: req.id } });
    }
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) { next(err); }
});

authRouter.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

authRouter.patch('/profile', authRequired, async (req, res, next) => {
  try {
    const { alias, ageBand, gender, district, language } = req.body || {};
    const user = await updateProfile(req.user.id, { alias, ageBand, gender, district, language });
    res.json({ user });
  } catch (err) { next(err); }
});

// --- GOOGLE OAUTH ROUTES ---

// 1. Redirect to Google
authRouter.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// 2. Google Callback
authRouter.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    try {
      // Passport puts the user in req.user
      const user = req.user;
      const token = signAccessToken(user);

      // Redirect to frontend with token in query params
      // Example: https://your-frontend.com/auth/success?token=...
      const frontendUrl = config.corsOrigin || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/success?token=${token}`);
    } catch (err) {
      res.status(500).json({ error: { code: 'OAUTH_ERROR', message: 'Failed to generate token', requestId: req.id } });
    }
  }
);
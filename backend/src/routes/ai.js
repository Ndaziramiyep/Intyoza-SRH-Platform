import express, { Router } from 'express';
import { authOptional, authRequired } from '../middleware/auth.js'; 
import { processChatMessage } from '../services/ai.service.js';
import { transcribeAudio } from '../lib/ai/transcribe.js';

export const aiRouter = Router();

// Chat (Allows Guests)
aiRouter.post('/chat', authOptional, async (req, res, next) => {
  try {
    const { message, sessionId, suggestion } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'message is required', requestId: req.id },
      });
    }

    const result = await processChatMessage({
      user: req.user || null, // Pass the whole user object
      sessionId,
      message,
      language: req.user?.language || 'EN',
      suggestion: suggestion === true,
    });
    
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Transcribe (Requires Login)
aiRouter.post(
  '/transcribe',
  authRequired,
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '10mb' }),
  async (req, res, next) => {
    try {
      const result = await transcribeAudio({
        audio: Buffer.isBuffer(req.body) ? req.body : null,
        contentType: req.get('Content-Type'),
        lang: req.query.lang,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
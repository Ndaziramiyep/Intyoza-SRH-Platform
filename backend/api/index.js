// Vercel serverless entry point. Vercel calls the exported app per request,
// so there is no app.listen() here; src/server.js is still used locally.
import { createApp } from '../src/app.js';

export default createApp();

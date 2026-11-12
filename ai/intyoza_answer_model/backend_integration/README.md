# Backend integration (for the backend owner)

These files are NOT applied to the backend. They show how the backend can use Intyoza's answer model first
and the `ai/intyoza_srh` bot as the fallback. The backend owner decides whether to add them.

1. Copy `hybrid.js` to `backend/src/lib/ai/hybrid.js` and `hybrid-provider.test.js` to `backend/tests/`.
2. `backend/src/lib/ai/index.js`: add `import { hybridProvider } from './hybrid.js';` and `hybrid: hybridProvider,` to `providers`.
3. `backend/src/config.js`: add to the config object:
   ```js
   aiLlmUrl: (process.env.AI_LLM_URL || '').replace(/\/$/, '') || null,
   aiLlmKey: process.env.AI_LLM_KEY || null,
   aiLlmTimeoutMs: Number(process.env.AI_LLM_TIMEOUT_MS) || 60_000,
   aiLlmRetryMs: Number(process.env.AI_LLM_RETRY_MS) || 60_000,
   ```
4. `backend/.env`: `AI_PROVIDER=hybrid`, `AI_LLM_URL=<answer model address>`, `AI_LLM_KEY=<its key>`.

Tested with the existing provider tests: 11 of 11 pass (`node --test tests/hybrid-provider.test.js tests/intyoza-provider.test.js`).

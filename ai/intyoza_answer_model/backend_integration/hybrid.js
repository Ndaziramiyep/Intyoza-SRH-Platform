import { config } from '../../config.js';
import { intyozaProvider } from './intyoza.js';

// Main AI + fallback.
// 1. Main: Intyoza's own answer model (fine-tuned AfriqueQwen, needs a GPU). It writes answers in
//    Kinyarwanda or English from approved answers and trusted documents. API: POST {AI_LLM_URL}/generate.
// 2. Fallback: the intyoza_srh bot (ai/intyoza_srh, runs on any CPU), used when the main model is
//    not configured, not reachable, too slow or returns an error.
// After a failure the main model is skipped for AI_LLM_RETRY_MS, so users do not wait for it on every message.

let skipMainUntil = 0;

function mainError(reason) {
  const err = new Error(`Main AI model unavailable: ${reason}`);
  err.code = 'AI_MAIN_UNAVAILABLE';
  return err;
}

// Reply kinds of the main model -> the "type" values the frontend already knows from the fallback bot.
function typeOf(kind, escalate) {
  if (escalate) return 'safe';
  if (kind === 'not_covered') return 'not_sure';
  if (kind === 'off_topic') return 'off_topic';
  if (kind === 'greeting' || kind === 'small_talk') return 'small_talk';
  return 'answer';
}

async function callMain({ userId = 'anonymous', language = 'RW', history = [], message = '' }) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.aiLlmKey) headers['X-API-Key'] = config.aiLlmKey;
  let res;
  try {
    res = await fetch(`${config.aiLlmUrl}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId: String(userId), language, history, message }),
      signal: AbortSignal.timeout(config.aiLlmTimeoutMs),
    });
  } catch (e) {
    throw mainError(e?.name === 'TimeoutError' ? 'timeout' : 'not reachable');
  }
  if (!res.ok) throw mainError(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data || typeof data.reply !== 'string' || !data.reply.trim()) throw mainError('empty reply');

  const escalate = Boolean(data.escalate);
  return {
    reply: data.reply,
    escalate,
    escalateReason: escalate ? data.escalateReason || 'risk' : null,
    sources: data.sources ?? [],
    type: typeOf(data.kind, escalate),
    title: null,
    topic: null,
    suggestions: data.suggestions ?? [],
    disclaimer: null,
    bestGuess: false,
    confidence: null,
    model: 'main',
  };
}

export const hybridProvider = {
  name: 'hybrid',
  /**
   * @param {{ userId?: string, language?: string, history?: {role: string, content: string}[],
   *           message: string, suggestion?: boolean }} input
   */
  async generate(input = {}) {
    if (config.aiLlmUrl && Date.now() >= skipMainUntil) {
      try {
        return await callMain(input);
      } catch {
        skipMainUntil = Date.now() + config.aiLlmRetryMs;
      }
    }
    const r = await intyozaProvider.generate(input);
    return { ...r, model: 'fallback' };
  },
};

// For tests: forget a previous failure of the main model.
export function resetHybridState() {
  skipMainUntil = 0;
}

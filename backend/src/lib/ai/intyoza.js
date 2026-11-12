import { config } from '../../config.js';

const HISTORY_SENT = 10; 

function unavailable() {
  const err = new Error('The AI service is not reachable right now');
  err.status = 503;
  err.code = 'AI_UNAVAILABLE';
  return err;
}

const REASONS = {
  self_harm: 'self_harm',
  violence: 'abuse_disclosure',
  medical: 'medical_emergency',
  emergency: 'medical_emergency',
};

const SMALL_TALK = new Set([
  'greeting', 'small_talk', 'how_are_you', 'thanks', 'goodbye', 'ack', 'who', 'disagree', 'repeat', 'empty', 'quiz', 'topic',
]);

function typeOf(kind, escalate) {
  if (escalate) return 'safe';
  if (kind === 'not_covered' || kind === 'clarify' || kind === 'unknown') return 'not_sure';
  if (kind === 'off_topic') return 'off_topic';
  if (SMALL_TALK.has(kind)) return 'small_talk';
  return 'answer';
}

async function call(path, body, headers = {}) {
  try {
    return await fetch(`${config.aiServiceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.aiTimeoutMs),
    });
  } catch {
    throw unavailable(); 
  }
}

/** One message on its own (no context) */
async function single({ message, suggestion, profile }) {
  const res = await call('/api/chat', suggestion ? { title: message, profile } : { message, profile });
  if (!res.ok) throw unavailable();
  const data = await res.json();
  const safe = data.type === 'safe';
  return {
    reply: data.answer,
    escalate: safe,
    escalateReason: safe ? data.intent : null,
    sources: data.source ? [data.source] : [],
    type: data.type,
    title: data.title ?? null,
    topic: data.topic ?? null,
    suggestions: data.suggestions ?? [],
    disclaimer: data.disclaimer ?? null,
    bestGuess: Boolean(data.best_guess),
    confidence: data.confidence ?? null,
  };
}

/** The message with the conversation so far. */
async function withContext({ conversationId, message, history, ageBand, profile }) {
  const res = await call(
    '/generate',
    {
      userId: `chat:${conversationId}`,
      language: 'AUTO', 
      history: history.slice(-HISTORY_SENT),
      message,
      ageBand: ageBand || 'UNKNOWN',
      profile: profile || {}, // <-- Passing profile to the AI
    },
    { 'X-API-Key': config.aiServiceKey },
  );
  if ([401, 403, 404, 405, 422].includes(res.status)) return null;
  if (!res.ok) throw unavailable();
  const data = await res.json();
  const escalate = Boolean(data.escalate);
  const type = typeOf(data.kind, escalate);
  return {
    reply: data.reply,
    escalate,
    escalateReason: escalate ? (REASONS[data.escalateReason] ?? data.escalateReason ?? null) : null,
    sources: type === 'answer' ? (data.sources ?? []) : [],
    type,
    title: null,
    topic: null,
    suggestions: data.suggestions ?? [],
    disclaimer: null,
    bestGuess: false,
    confidence: null,
  };
}

export const intyozaProvider = {
  name: 'intyoza',
  async generate({ message = '', suggestion = false, conversationId, history = [], ageBand, profile = {} } = {}) {
    if (config.aiServiceKey && conversationId) {
      const reply = await withContext({ conversationId, message, history, ageBand, profile });
      if (reply) return reply;
    }
    return single({ message, suggestion, profile });
  },
};
import { test, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// The main model must be configured for these tests (set before the config is loaded).
process.env.AI_LLM_URL ||= 'http://llm.test';
const { hybridProvider, resetHybridState } = await import('../src/lib/ai/hybrid.js');
const { config } = await import('../src/config.js');

// No model servers needed: fetch is replaced with canned replies from the main model and the fallback bot.
const realFetch = globalThis.fetch;
let calls;

function servers({ main, fallback }) {
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (url.endsWith('/generate')) {
      calls.push({ to: 'main', body, headers: init.headers });
      return main(body);
    }
    calls.push({ to: 'fallback', body });
    return fallback(body);
  };
}
const ok = (data) => ({ ok: true, status: 200, json: async () => data });
const fallbackAnswer = () => ok({ type: 'answer', answer: 'Fallback answer', source: 'KB', suggestions: [] });

beforeEach(() => {
  calls = [];
  resetHybridState();
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('uses the main model when it answers', async () => {
  servers({
    main: () => ok({ reply: 'Agakingirizo ni...', escalate: false, sources: ['Approved Q&A'], suggestions: ['Q2'], kind: 'answer' }),
    fallback: fallbackAnswer,
  });
  const r = await hybridProvider.generate({ userId: 'u1', language: 'RW', history: [], message: 'Agakingirizo ni iki?' });
  assert.equal(r.reply, 'Agakingirizo ni...');
  assert.equal(r.model, 'main');
  assert.equal(r.type, 'answer');
  assert.deepEqual(r.sources, ['Approved Q&A']);
  assert.deepEqual(calls.map((c) => c.to), ['main']);
  assert.equal(calls[0].body.message, 'Agakingirizo ni iki?');
  assert.equal(calls[0].body.language, 'RW');
  if (config.aiLlmKey) assert.equal(calls[0].headers['X-API-Key'], config.aiLlmKey);
});

test('a help reply from the main model escalates', async () => {
  servers({
    main: () => ok({ reply: 'Hamagara 112...', escalate: true, escalateReason: 'Emergency', kind: 'help_now' }),
    fallback: fallbackAnswer,
  });
  const r = await hybridProvider.generate({ message: '...' });
  assert.equal(r.escalate, true);
  assert.equal(r.type, 'safe');
  assert.equal(r.escalateReason, 'Emergency');
});

test('not covered maps to not_sure', async () => {
  servers({ main: () => ok({ reply: 'Ntabwo...', escalate: false, kind: 'not_covered' }), fallback: fallbackAnswer });
  assert.equal((await hybridProvider.generate({ message: 'x' })).type, 'not_sure');
});

test('falls back when the main model is down, then skips it for a while', async () => {
  servers({
    main: () => {
      throw new TypeError('fetch failed');
    },
    fallback: fallbackAnswer,
  });
  const r1 = await hybridProvider.generate({ message: 'what is PrEP' });
  assert.equal(r1.reply, 'Fallback answer');
  assert.equal(r1.model, 'fallback');
  const r2 = await hybridProvider.generate({ message: 'what is PEP' });
  assert.equal(r2.model, 'fallback');
  assert.deepEqual(calls.map((c) => c.to), ['main', 'fallback', 'fallback']);
});

test('falls back on an HTTP error or an empty reply', async () => {
  servers({ main: () => ({ ok: false, status: 500, json: async () => ({}) }), fallback: fallbackAnswer });
  assert.equal((await hybridProvider.generate({ message: 'x' })).model, 'fallback');
  resetHybridState();
  servers({ main: () => ok({ reply: '  ', escalate: false, kind: 'answer' }), fallback: fallbackAnswer });
  assert.equal((await hybridProvider.generate({ message: 'x' })).model, 'fallback');
});

test('a tapped suggestion still reaches the fallback as a title', async () => {
  servers({
    main: () => {
      throw new TypeError('fetch failed');
    },
    fallback: fallbackAnswer,
  });
  await hybridProvider.generate({ message: 'HIV testing', suggestion: true });
  assert.deepEqual(calls[1].body, { title: 'HIV testing' });
});

test('both down is a 503 AI_UNAVAILABLE', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(hybridProvider.generate({ message: 'hi' }), { status: 503, code: 'AI_UNAVAILABLE' });
});

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// With the service key, messages go to POST /generate with the conversation (each test file runs in its own process).
process.env.AI_SERVICE_KEY = 'test-key';
const { intyozaProvider } = await import('../src/lib/ai/intyoza.js');

const realFetch = globalThis.fetch;
let calls = [];

function service(handler) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    const call = { path: new URL(url).pathname, body: JSON.parse(init.body), headers: init.headers };
    calls.push(call);
    const { status = 200, body = {} } = handler(call);
    return { ok: status < 400, status, json: async () => body };
  };
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

const history = Array.from({ length: 14 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));

test('sends the message with the conversation to /generate', async () => {
  service(() => ({
    body: { reply: 'Gakoreshwa utya...', escalate: false, sources: ['WHO'], suggestions: ['Where to get condoms'], kind: 'answer' },
  }));

  const r = await intyozaProvider.generate({ message: 'gakoreshwa gute?', conversationId: 'abc', history, ageBand: 'AGE_15_19' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/generate');
  assert.equal(calls[0].headers['X-API-Key'], 'test-key');
  assert.equal(calls[0].body.userId, 'chat:abc');
  assert.equal(calls[0].body.language, 'AUTO');
  assert.equal(calls[0].body.ageBand, 'AGE_15_19');
  assert.equal(calls[0].body.history.length, 10); // only the most recent messages
  assert.equal(calls[0].body.history.at(-1).content, 'm13');
  assert.equal(r.reply, 'Gakoreshwa utya...');
  assert.equal(r.type, 'answer');
  assert.deepEqual(r.sources, ['WHO']);
  assert.deepEqual(r.suggestions, ['Where to get condoms']);
});

test('a help reply escalates with the reason the app knows', async () => {
  service(() => ({ body: { reply: 'Hamagara 3512...', escalate: true, escalateReason: 'violence', kind: 'help_now' } }));
  const r = await intyozaProvider.generate({ message: '...', conversationId: 'abc' });
  assert.equal(r.escalate, true);
  assert.equal(r.escalateReason, 'abuse_disclosure');
  assert.equal(r.type, 'safe');
});

test('small talk is not shown as an answer with sources', async () => {
  service(() => ({ body: { reply: 'Meze neza!', escalate: false, sources: ['x'], kind: 'how_are_you' } }));
  const r = await intyozaProvider.generate({ message: 'mumeze mute', conversationId: 'abc' });
  assert.equal(r.type, 'small_talk');
  assert.deepEqual(r.sources, []);
});

test('a wrong key or a service without /generate falls back to one message at a time', async () => {
  service((call) =>
    call.path === '/generate' ? { status: 401, body: { detail: 'Invalid API key' } } : { body: { type: 'answer', answer: 'ok' } },
  );
  const r = await intyozaProvider.generate({ message: 'hi', conversationId: 'abc' });
  assert.deepEqual(calls.map((c) => c.path), ['/generate', '/api/chat']);
  assert.equal(r.reply, 'ok');
});

test('without a chat id the old single-message call is used', async () => {
  service(() => ({ body: { type: 'answer', answer: 'ok' } }));
  await intyozaProvider.generate({ message: 'HIV testing', suggestion: true });
  assert.deepEqual(calls.map((c) => c.path), ['/api/chat']);
  assert.deepEqual(calls[0].body, { title: 'HIV testing' });
});

test('an unreachable service is a 503 and is not called twice', async () => {
  calls = [];
  globalThis.fetch = async () => {
    calls.push(1);
    throw new TypeError('fetch failed');
  };
  await assert.rejects(intyozaProvider.generate({ message: 'hi', conversationId: 'abc' }), { status: 503, code: 'AI_UNAVAILABLE' });
  assert.equal(calls.length, 1);

  service(() => ({ status: 500, body: {} }));
  await assert.rejects(intyozaProvider.generate({ message: 'hi', conversationId: 'abc' }), { status: 503 });
});

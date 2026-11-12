import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { intyozaProvider } from '../src/lib/ai/intyoza.js';

// The trained model server isn't needed: fetch is replaced with canned model replies.
const realFetch = globalThis.fetch;
let lastBody;

function modelReplies(reply, ok = true) {
  globalThis.fetch = async (url, init) => {
    lastBody = JSON.parse(init.body);
    return { ok, json: async () => reply };
  };
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('maps a model answer', async () => {
  modelReplies({
    type: 'answer',
    intent: 'srh_question',
    title: 'PrEP',
    topic: 'hiv',
    answer: 'PrEP is a daily pill...',
    disclaimer: 'General information.',
    suggestions: ['Who PrEP is for'],
    source: 'RBC guidelines',
    confidence: 91,
  });

  const r = await intyozaProvider.generate({ message: 'what is PrEP' });

  assert.deepEqual(lastBody, { message: 'what is PrEP' });
  assert.equal(r.reply, 'PrEP is a daily pill...');
  assert.equal(r.escalate, false);
  assert.deepEqual(r.sources, ['RBC guidelines']);
  assert.deepEqual(r.suggestions, ['Who PrEP is for']);
  assert.equal(r.topic, 'hiv');
  assert.equal(r.confidence, 91);
});

test('a tapped suggestion is sent as a title', async () => {
  modelReplies({ type: 'answer', answer: '...', suggestions: [] });
  await intyozaProvider.generate({ message: 'HIV testing', suggestion: true });
  assert.deepEqual(lastBody, { title: 'HIV testing' });
});

test('a safety reply escalates with its reason', async () => {
  modelReplies({ type: 'safe', intent: 'abuse_disclosure', answer: 'Call 3512...', suggestions: [] });
  const r = await intyozaProvider.generate({ message: '...' });
  assert.equal(r.escalate, true);
  assert.equal(r.escalateReason, 'abuse_disclosure');
});

test('an unreachable model is a 503 AI_UNAVAILABLE', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(intyozaProvider.generate({ message: 'hi' }), { status: 503, code: 'AI_UNAVAILABLE' });

  modelReplies({ error: 'boom' }, false);
  await assert.rejects(intyozaProvider.generate({ message: 'hi' }), { status: 503, code: 'AI_UNAVAILABLE' });
});

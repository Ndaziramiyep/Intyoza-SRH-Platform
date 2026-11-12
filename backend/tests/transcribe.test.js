import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { transcribeAudio } from '../src/lib/ai/transcribe.js';
import { createApp } from '../src/app.js';

// The AI service is not needed: fetch is replaced with canned replies.
const realFetch = globalThis.fetch;
let last;

function aiReplies(status, body) {
  globalThis.fetch = async (url, init) => {
    last = { url, init };
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('sends the audio to the AI service and returns the text', async () => {
  aiReplies(200, { text: ' ese umuhungu nawe yatwita ', language: 'rw', seconds: 3.4 });
  const audio = Buffer.from('fake-webm-bytes');
  const r = await transcribeAudio({ audio, contentType: 'audio/webm', lang: 'rw' });
  assert.deepEqual(r, { text: 'ese umuhungu nawe yatwita', language: 'rw', seconds: 3.4 });
  assert.ok(last.url.endsWith('/api/transcribe?lang=rw'));
  assert.equal(last.init.headers['Content-Type'], 'audio/webm');
  assert.equal(last.init.body, audio);
});

test('unknown language falls back to Kinyarwanda', async () => {
  aiReplies(200, { text: 'x' });
  await transcribeAudio({ audio: Buffer.from('a'), lang: 'fr' });
  assert.ok(last.url.endsWith('?lang=rw'));
});

test('empty audio is a 400', async () => {
  await assert.rejects(transcribeAudio({ audio: Buffer.alloc(0) }), { status: 400, code: 'INVALID_INPUT' });
});

test('unreadable audio is a 422, service down is a 503', async () => {
  aiReplies(422, { detail: 'could not read the audio' });
  await assert.rejects(transcribeAudio({ audio: Buffer.from('a') }), { status: 422, code: 'AUDIO_UNREADABLE' });
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(transcribeAudio({ audio: Buffer.from('a') }), { status: 503, code: 'AI_UNAVAILABLE' });
});

test('POST /ai/transcribe requires auth', async () => {
  const res = await request(createApp())
    .post('/api/v1/ai/transcribe')
    .set('Content-Type', 'audio/webm')
    .send(Buffer.from('abc'));
  assert.equal(res.status, 401);
});

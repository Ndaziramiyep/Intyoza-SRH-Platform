import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

test('GET /health returns ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.ok(res.headers['x-request-id']);
});

test('GET /api/v1 returns API identity', async () => {
  const res = await request(app).get('/api/v1');
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Intyoza API');
});

test('GET unknown route returns structured 404', async () => {
  const res = await request(app).get('/nope');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.ok(res.body.error.requestId);
});
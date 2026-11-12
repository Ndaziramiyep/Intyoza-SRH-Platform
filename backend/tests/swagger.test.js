import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

test('GET /api-docs follows Swagger UI redirect and loads the docs page', async () => {
  const res = await request(app).get('/api-docs').redirects(1);

  assert.equal(res.status, 200);
  assert.match(res.text, /swagger-ui|Intyoza API Docs/i);
});

test('GET /api-docs.json returns OpenAPI document', async () => {
  const res = await request(app).get('/api-docs.json');

  assert.equal(res.status, 200);
  assert.equal(res.body.openapi, '3.0.0');
  assert.equal(res.body.info.title, 'Intyoza SRH Platform API');
});

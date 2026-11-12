import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';

const app = createApp();
const testEmail = `test-${Date.now()}@example.com`;

before(async () => {
  await prisma.consent.deleteMany();
  await prisma.user.deleteMany();
});

after(async () => {
  await prisma.$disconnect();
});

test('POST /auth/register creates a user and returns a token', async () => {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: testEmail, password: 'Password123!', language: 'EN' });

  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, testEmail);
});

test('POST /auth/register rejects duplicate email', async () => {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: testEmail, password: 'Password123!' });

  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'EMAIL_IN_USE');
});

test('POST /auth/login succeeds with correct credentials', async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: testEmail, password: 'Password123!' });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('PATCH /auth/profile updates the community alias', async () => {
  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: testEmail, password: 'Password123!' });
  
  const token = login.body.token;

  const res = await request(app)
    .patch('/api/v1/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ alias: 'BraveLion99' });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.alias, 'BraveLion99');
});
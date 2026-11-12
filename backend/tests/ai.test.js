import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { prisma } from '../src/lib/db.js';

// Force the tests to use the mock AI provider
process.env.AI_PROVIDER = 'mock';

const { createApp } = await import('../src/app.js');
const app = createApp();

let token;

before(async () => {
  await prisma.aIChatMessage.deleteMany();
  await prisma.aIChatSession.deleteMany();
  await prisma.consent.deleteMany();
  await prisma.user.deleteMany();

  const res = await request(app).post('/api/v1/auth/register').send({ 
    email: `ai-test-${Date.now()}@example.com`, 
    password: 'Password123!',
    language: 'RW' 
  });
  token = res.body.token;
});

after(async () => {
  await prisma.$disconnect();
});

test('POST /ai/chat allows guest access (no token)', async () => {
  const res = await request(app).post('/api/v1/ai/chat').send({ message: 'Hello' });
  assert.equal(res.status, 200);
  assert.equal(res.body.isGuest, true);
  assert.equal(res.body.sessionId, null);
});

test('POST /ai/chat creates a session and returns mock reply', async () => {
  const res = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'Hello AI' });

  assert.equal(res.status, 200);
  assert.ok(res.body.sessionId);
  assert.ok(res.body.reply.includes('Iki ni igisubizo')); 
  assert.equal(res.body.escalate, false);
  assert.equal(res.body.isGuest, false);
});

test('POST /ai/chat escalates on emergency keywords', async () => {
  const res = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'I have an emergency' });

  assert.equal(res.status, 200);
  assert.equal(res.body.escalate, true);
  assert.equal(res.body.escalateReason, 'emergency');
});

test('POST /ai/chat appends to existing session with follow-up', async () => {
  const res1 = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'First message' });
  
  const sessionId = res1.body.sessionId;

  const res2 = await request(app)
    .post('/api/v1/ai/chat')
    .set('Authorization', `Bearer ${token}`)
    .send({ message: 'Second message', sessionId });

  assert.equal(res2.status, 200);
  assert.equal(res2.body.sessionId, sessionId);
  
  const messages = await prisma.aIChatMessage.findMany({ where: { sessionId } });
  assert.equal(messages.filter(m => m.role === 'USER').length, 2);
});
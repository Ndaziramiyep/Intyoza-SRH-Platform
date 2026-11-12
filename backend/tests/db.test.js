import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/db.js';

before(async () => {
  await prisma.consent.deleteMany();
  await prisma.user.deleteMany();
});

after(async () => {
  await prisma.$disconnect();
});

test('can create a user with required fields', async () => {
  const user = await prisma.user.create({
    data: { 
      email: 'test-db@example.com',
      passwordHash: 'dummy-hash',
      language: 'EN', 
      ageBand: 'AGE_15_19' 
    },
  });
  assert.equal(user.role, 'USER');
  assert.equal(user.language, 'EN');
  assert.equal(user.email, 'test-db@example.com');
});

test('can attach a consent record', async () => {
  const user = await prisma.user.create({ 
    data: { email: 'test-db2@example.com', passwordHash: 'dummy-hash' } 
  });
  const consent = await prisma.consent.create({
    data: {
      userId: user.id,
      type: 'PRIVACY',
      version: 'v1-2025-01',
      granted: true,
    },
  });
  assert.equal(consent.granted, true);
  assert.equal(consent.userId, user.id);
});
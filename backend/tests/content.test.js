import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';

const app = createApp();

before(async () => {
  await prisma.facilityService.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.myth.deleteMany();

  await prisma.myth.create({
    data: {
      language: 'EN',
      mythText: 'You cannot get pregnant the first time.',
      factText: 'You can get pregnant any time you have unprotected sex.',
      sources: ['https://who.int/example'],
    },
  });

  const facility = await prisma.facility.create({
    data: {
      name: 'Kigali Youth Center',
      district: 'Gasabo',
      latitude: -1.9441,
      longitude: 30.0619,
      isYouthFriendly: 'YES', // Changed from boolean to Enum
    },
  });

  await prisma.facilityService.create({
    data: {
      facilityId: facility.id,
      serviceName: 'STI_TESTING',
      status: 'YES',      
      costType: 'FREE',   
    },
  });
});

after(async () => {
  await prisma.$disconnect();
});

test('GET /myths returns myths', async () => {
  const res = await request(app).get('/api/v1/myths?language=EN');
  assert.equal(res.status, 200);
  assert.equal(res.body.myths.length, 1);
});

test('GET /facilities returns all facilities', async () => {
  const res = await request(app).get('/api/v1/facilities');
  assert.equal(res.status, 200);
  assert.equal(res.body.facilities.length, 1);
  assert.equal(res.body.facilities[0].services[0].serviceName, 'STI_TESTING');
});

test('GET /facilities?district=Gasabo filters correctly', async () => {
  const res1 = await request(app).get('/api/v1/facilities?district=Gasabo');
  assert.equal(res1.status, 200);
  assert.equal(res1.body.facilities.length, 1);

  const res2 = await request(app).get('/api/v1/facilities?district=Kicukiro');
  assert.equal(res2.status, 200);
  assert.equal(res2.body.facilities.length, 0);
});
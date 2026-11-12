import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';

const app = createApp();
let userToken;
let adminToken;

before(async () => {
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create a normal user via the API
  const userRes = await request(app).post('/api/v1/auth/register').send({ 
    email: `user-learn-${Date.now()}@example.com`, 
    password: 'Password123!' 
  });
  userToken = userRes.body.token;

  // 2. Create an admin user manually in DB (with required email/password)
  const adminUser = await prisma.user.create({
    data: { 
      email: `admin-learn-${Date.now()}@example.com`, 
      passwordHash: 'dummy-hash', 
      role: 'ADMIN' 
    },
  });
  
  const { signAccessToken } = await import('../src/lib/jwt.js');
  adminToken = signAccessToken(adminUser);
});

after(async () => {
  await prisma.$disconnect();
});

test('ADMIN can create a category and article', async () => {
  const catRes = await request(app)
    .post('/api/v1/admin/learning/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ slug: 'puberty', nameEn: 'Puberty', nameRw: 'Igihe cy\'ubwangavu' });

  assert.equal(catRes.status, 201);
  const categoryId = catRes.body.category.id;

  const artRes = await request(app)
    .post('/api/v1/admin/learning/articles')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      categoryId,
      language: 'EN',
      title: 'What is puberty?',
      content: 'Puberty is...',
      format: 'ARTICLE',
      isLowData: true,
    });

  assert.equal(artRes.status, 201);
  assert.equal(artRes.body.article.title, 'What is puberty?');
});

test('NORMAL USER cannot create content', async () => {
  const res = await request(app)
    .post('/api/v1/admin/learning/categories')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ slug: 'fail', nameEn: 'Fail', nameRw: 'Fail' });

  assert.equal(res.status, 403); // Forbidden
  assert.equal(res.body.error.code, 'FORBIDDEN');
});

test('PUBLIC can fetch categories and articles', async () => {
  const catRes = await request(app).get('/api/v1/learning/categories');
  assert.equal(catRes.status, 200);
  assert.equal(catRes.body.categories.length, 1);

  const artRes = await request(app).get('/api/v1/learning/articles');
  assert.equal(artRes.status, 200);
  assert.equal(artRes.body.articles.length, 1);
  assert.equal(artRes.body.articles[0].isLowData, true);
});
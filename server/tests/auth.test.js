'use strict';

const request = require('supertest');
const { resetDb, closeDb, PASSWORD } = require('./setup');
const createApp = require('../src/app');

let app;

beforeAll(async () => {
  await resetDb();
  app = createApp();
});

afterAll(closeDb);

describe('Auth: регистрация, заявка, вход', () => {
  test('регистрация создаёт заявку, вход до одобрения запрещён', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Новый Вожатый', email: 'new@campus.ru', password: 'Secret1!' });
    expect(reg.status).toBe(200);
    expect(reg.body.userId).toBeDefined();

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'new@campus.ru', password: 'Secret1!' });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_PENDING');
  });

  test('полный цикл: register → director approve → login', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Второй Вожатый', email: 'second@campus.ru', password: 'Secret1!' });

    const directorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'director@campus.ru', password: PASSWORD });
    const dtoken = directorLogin.body.token;

    const apps = await request(app)
      .get('/api/v1/applications?status=pending')
      .set('Authorization', `Bearer ${dtoken}`);
    const pending = apps.body.find((a) => a.user.email === 'second@campus.ru');
    expect(pending).toBeDefined();

    const approve = await request(app)
      .post(`/api/v1/applications/${pending.id}/approve`)
      .set('Authorization', `Bearer ${dtoken}`);
    expect(approve.status).toBe(200);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'second@campus.ru', password: 'Secret1!' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeDefined();
  });

  test('валидация: слабый пароль, плохая почта, занятая почта', async () => {
    const weak = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'X', email: 'weak@campus.ru', password: 'simple' });
    expect(weak.status).toBe(400);

    const badEmail = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'X', email: 'not-an-email', password: 'Secret1!' });
    expect(badEmail.status).toBe(400);

    const taken = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'X', email: 'director@campus.ru', password: 'Secret1!' });
    expect(taken.status).toBe(400);
    expect(taken.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('неверный пароль при входе → 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'director@campus.ru', password: 'Wrong!23' });
    expect(res.status).toBe(401);
  });

  test('verify-jwt и проверки прав', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'counselour@campus.ru', password: PASSWORD });
    const token = login.body.token;

    const ok = await request(app)
      .get('/api/v1/auth/verify-jwt')
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);

    const noToken = await request(app).get('/api/v1/auth/verify-jwt');
    expect(noToken.status).toBe(401);

    const seniorCheck = await request(app)
      .get('/api/v1/auth/verify-senior-counselour-rights')
      .set('Authorization', `Bearer ${token}`);
    expect(seniorCheck.status).toBe(403);

    const directorCheck = await request(app)
      .get('/api/v1/auth/verify-director-rights')
      .set('Authorization', `Bearer ${token}`);
    expect(directorCheck.status).toBe(403);
  });
});

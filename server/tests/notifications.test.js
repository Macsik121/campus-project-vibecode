'use strict';

const request = require('supertest');
const { resetDb, closeDb, PASSWORD } = require('./setup');
const createApp = require('../src/app');

let app;

async function login(email) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  return res.body.token;
}

beforeAll(async () => {
  await resetDb();
  app = createApp();
});

afterAll(closeDb);

describe('Уведомления и профиль', () => {
  test('список, прочтение одного и всех, счётчик непрочитанных', async () => {
    const stoken = await login('senior@campus.ru');
    await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ title: 'Тест', description: 'Описание', kind: 'info' });

    const ctoken = await login('counselour@campus.ru');
    const list1 = await request(app)
      .get('/api/v1/notifications?limit=20')
      .set('Authorization', `Bearer ${ctoken}`);
    expect(list1.body.unreadCount).toBeGreaterThan(0);

    const notifId = list1.body.items[0].id;
    const read = await request(app)
      .post('/api/v1/notifications/read')
      .set('Authorization', `Bearer ${ctoken}`)
      .send({ notifId });
    expect(read.status).toBe(201);

    const readAll = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${ctoken}`);
    expect(readAll.status).toBe(200);

    const list2 = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${ctoken}`);
    expect(list2.body.unreadCount).toBe(0);
  });

  test('создание уведомления обычным вожатым → 403', async () => {
    const ctoken = await login('counselour@campus.ru');
    const res = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${ctoken}`)
      .send({ title: 'X', description: 'Y' });
    expect(res.status).toBe(403);
  });

  test('редактирование уведомления сбрасывает прочитанность (по Swagger)', async () => {
    const stoken = await login('senior@campus.ru');
    const ctoken = await login('counselour@campus.ru');

    const created = await request(app)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ title: 'Старое', description: 'Текст', kind: 'info' });

    await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${ctoken}`);

    const updated = await request(app)
      .put('/api/v1/notifications')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ id: created.body.id, title: 'Новое' });
    expect(updated.status).toBe(200);

    const list = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${ctoken}`);
    expect(list.body.unreadCount).toBe(1);
  });

  test('профиль: просмотр и обновление', async () => {
    const ctoken = await login('counselour@campus.ru');
    const prof = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${ctoken}`);
    expect(prof.status).toBe(200);
    expect(prof.body.role).toBe('counselour');
    expect(prof.body.squad).not.toBeNull();

    const upd = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${ctoken}`)
      .send({ fullName: 'Вожатый Обновлённый', phoneNumber: '89999999999' });
    expect(upd.status).toBe(200);
    expect(upd.body.fullName).toBe('Вожатый Обновлённый');
  });

  test('смена пароля: неверный старый → 401, верный → вход с новым', async () => {
    const ctoken = await login('counselour@campus.ru');

    const wrong = await request(app)
      .put('/api/v1/users/password')
      .set('Authorization', `Bearer ${ctoken}`)
      .send({ oldPassword: 'Nope!1', newPassword: 'NewPass1!' });
    expect(wrong.status).toBe(401);

    const ok = await request(app)
      .put('/api/v1/users/password')
      .set('Authorization', `Bearer ${ctoken}`)
      .send({ oldPassword: PASSWORD, newPassword: 'NewPass1!' });
    expect(ok.status).toBe(200);

    const relogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'counselour@campus.ru', password: 'NewPass1!' });
    expect(relogin.status).toBe(200);
  });
});

'use strict';

const request = require('supertest');
const { resetDb, closeDb, PASSWORD } = require('./setup');
const createApp = require('../src/app');

let app;
let ctx;

async function login(email) {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD });
  return res.body.token;
}

beforeAll(async () => {
  ctx = await resetDb();
  app = createApp();
});

afterAll(closeDb);

describe('Отряды и дети', () => {
  test('GET /users/squad: назначенный вожатый получает squadId', async () => {
    const token = await login('counselour@campus.ru');
    const res = await request(app)
      .get('/api/v1/users/squad')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.squadId).toBe(ctx.squads.own);
  });

  test('GET /users/squad: неназначенный вожатый получает 404 NO_SQUAD', async () => {
    const token = await login('free@campus.ru');
    const res = await request(app)
      .get('/api/v1/users/squad')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NO_SQUAD');
  });

  test('вожатый читает детей своего отряда, чужой отряд → 403', async () => {
    const token = await login('counselour@campus.ru');
    const own = await request(app)
      .get(`/api/v1/squads/${ctx.squads.own}/children`)
      .set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    expect(own.body.children.length).toBe(2);
    expect(own.body.squadTitle).toBe('Тестовый отряд');

    const other = await request(app)
      .get(`/api/v1/squads/${ctx.squads.other}/children`)
      .set('Authorization', `Bearer ${token}`);
    expect(other.status).toBe(403);
  });

  test('старший вожатый читает любой отряд', async () => {
    const token = await login('senior@campus.ru');
    const res = await request(app)
      .get(`/api/v1/squads/${ctx.squads.other}/children`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.children.length).toBe(1);
  });

  test('создание отряда доступно только senior+', async () => {
    const ctoken = await login('counselour@campus.ru');
    const forbidden = await request(app)
      .post('/api/v1/squads')
      .set('Authorization', `Bearer ${ctoken}`)
      .send({ squadsData: [{ title: 'Новый', description: 'x' }] });
    expect(forbidden.status).toBe(403);

    const stoken = await login('senior@campus.ru');
    const ok = await request(app)
      .post('/api/v1/squads')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ squadsData: [{ title: 'Новый', description: 'x' }, { title: 'Второй' }] });
    expect(ok.status).toBe(200);
    expect(ok.body.squadIds.length).toBe(2);
  });

  test('вожатый обновляет заметки ребёнка своего отряда (PUT /children)', async () => {
    const token = await login('counselour@campus.ru');
    const childId = ctx.children[0];
    const res = await request(app)
      .put('/api/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: childId, notes: 'Обновлённая заметка' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Обновлённая заметка');
  });

  test('вожатый НЕ может изменить ребёнка чужого отряда → 403', async () => {
    const token = await login('counselour@campus.ru');
    const res = await request(app)
      .put('/api/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: ctx.children[2], notes: 'hack' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ASSIGNED');
  });

  test('создание ребёнка — только senior+, detach при удалении (soft-delete)', async () => {
    const stoken = await login('senior@campus.ru');
    const created = await request(app)
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ fullName: 'Новый Ребёнок', age: '9', parentFullName: 'Родитель', parentPhone: '89990000000', squadId: ctx.squads.own });
    expect(created.status).toBe(200);

    const del = await request(app)
      .delete(`/api/v1/children/${created.body.id}`)
      .set('Authorization', `Bearer ${stoken}`);
    expect(del.status).toBe(204);

    // soft-delete: в списке отряда ребёнка больше нет
    const list = await request(app)
      .get(`/api/v1/squads/${ctx.squads.own}/children`)
      .set('Authorization', `Bearer ${stoken}`);
    expect(list.body.children.find((c) => c.id === created.body.id)).toBeUndefined();
  });

  test('detached-список и привязка ребёнка к отряду', async () => {
    const stoken = await login('senior@campus.ru');
    const created = await request(app)
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ fullName: 'Беспризорный', age: '10', parentFullName: 'Родитель', parentPhone: '89990000001' });
    expect(created.status).toBe(200);

    const detached = await request(app)
      .get('/api/v1/children/detached')
      .set('Authorization', `Bearer ${stoken}`);
    expect(detached.body.find((c) => c.id === created.body.id)).toBeDefined();

    const attach = await request(app)
      .post('/api/v1/children/change-child-to-squad')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ childId: created.body.id, squadId: ctx.squads.own, attach: true });
    expect(attach.status).toBe(200);
    expect(attach.body.info).toBe('attached');
  });

  test('теги ребёнка: create/update/delete назначенным вожатым', async () => {
    const token = await login('counselour@campus.ru');
    const childId = ctx.children[0];

    const created = await request(app)
      .post('/api/v1/children/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, tagType: 'health', tagInfo: 'Астма' });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .put('/api/v1/children/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, tag: { id: created.body.id, type: 'alert', info: 'Ингалятор в рюкзаке' } });
    expect(updated.status).toBe(200);
    expect(updated.body.tagType).toBe('alert');

    const deleted = await request(app)
      .delete('/api/v1/children/tags')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send({ childId, tag: { id: created.body.id } });
    expect(deleted.status).toBe(204);

    const badType = await request(app)
      .post('/api/v1/children/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, tagType: 'unknown', tagInfo: 'x' });
    expect(badType.status).toBe(400);
  });
});

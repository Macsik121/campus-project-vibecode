'use strict';

const request = require('supertest');
const { resetDb, closeDb, PASSWORD } = require('./setup');
const createApp = require('../src/app');
const pool = require('../src/db/pool');

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

describe('Журнал: события и посещаемость', () => {
  test('GET /events?limit=10 возвращает события', async () => {
    const token = await login('counselour@campus.ru');
    const res = await request(app)
      .get('/api/v1/events?limit=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('создание события: валидация времени (time_from < time_to, >= 10 мин)', async () => {
    const stoken = await login('senior@campus.ru');

    const inverted = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ title: 'Плохое', timeFrom: '2030-01-01T10:00:00Z', timeTo: '2030-01-01T09:00:00Z' });
    expect(inverted.status).toBe(400);

    const tooShort = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ title: 'Короткое', timeFrom: '2030-01-01T10:00:00Z', timeTo: '2030-01-01T10:05:00Z' });
    expect(tooShort.status).toBe(400);
  });

  test('создание события доступно только senior+, attendance-строки создаются автоматически', async () => {
    const ctoken = await login('counselour@campus.ru');
    const forbidden = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${ctoken}`)
      .send({ title: 'X', timeFrom: '2030-01-01T10:00:00Z', timeTo: '2030-01-01T11:00:00Z' });
    expect(forbidden.status).toBe(403);

    const stoken = await login('senior@campus.ru');
    const created = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${stoken}`)
      .send({ title: 'Линейка', eventType: 'lineup', timeFrom: '2030-01-01T10:00:00Z', timeTo: '2030-01-01T11:00:00Z' });
    expect(created.status).toBe(201);

    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM event_attendance WHERE event_id = $1',
      [created.body.id]
    );
    expect(rows[0].n).toBe(ctx.children.length);
  });

  test('посещаемость: отметка, конфликт повторной отметки, снятие', async () => {
    const token = await login('counselour@campus.ru');
    const events = await request(app)
      .get('/api/v1/events?limit=10')
      .set('Authorization', `Bearer ${token}`);
    const eventId = events.body.find((e) => e.title === 'Событие сегодня').id;
    const childId = ctx.children[0];

    const mark = await request(app)
      .post(`/api/v1/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, present: true });
    expect(mark.status).toBe(200);

    const duplicate = await request(app)
      .post(`/api/v1/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, present: true });
    expect(duplicate.status).toBe(400);

    const att = await request(app)
      .get(`/api/v1/events/${eventId}/attendance/${ctx.squads.own}`)
      .set('Authorization', `Bearer ${token}`);
    expect(att.body.childIds).toContain(childId);

    const unmark = await request(app)
      .post(`/api/v1/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId, present: false });
    expect(unmark.status).toBe(200);
  });

  test('отметка чужого отряда обычным вожатым → 403', async () => {
    const token = await login('counselour@campus.ru');
    const events = await request(app)
      .get('/api/v1/events?limit=10')
      .set('Authorization', `Bearer ${token}`);
    const eventId = events.body[0].id;

    const res = await request(app)
      .post(`/api/v1/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${token}`)
      .send({ childId: ctx.children[2], present: true });
    expect(res.status).toBe(403);
  });

  test('фильтр Журнала по дате: события полностью внутри [min(date,today), max(date,today)]', async () => {
    const token = await login('counselour@campus.ru');
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const res = await request(app)
      .get(`/api/v1/events?date=${tomorrow}&limit=10`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const titles = res.body.map((e) => e.title);
    expect(titles).toContain('Событие сегодня');
    expect(titles).toContain('Событие завтра');
  });
});

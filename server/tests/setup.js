'use strict';

/**
 * Общая подготовка тестового окружения: отдельная БД campus_test,
 * миграции + очистка + seed-подобные фикстуры перед каждым тестовым файлом.
 */
process.env.DATABASE_URL = 'postgres://campus:campus@localhost:5432/campus_test';
process.env.JWT_SECRET = 'campus-test-secret';
process.env.PORT = '3001';

const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');
const migrate = require('../src/db/migrate');

const PASSWORD = 'Password1!';

async function resetDb() {
  await migrate();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE users, counselor_applications, shifts, users_in_shifts, squads,
               users_in_squads, children, child_tags, notifications,
               notifications_read_by_users, events, event_attendance,
               action_logs, messages, message_read_by_users RESTART IDENTITY CASCADE
    `);
    const hash = await bcrypt.hash(PASSWORD, 10);
    const users = await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, status) VALUES
        ('Директор Тестов', 'director@campus.ru', $1, '89001000001', 'director', 'active'),
        ('Старший Вожатый Тестов', 'senior@campus.ru', $1, '89001000002', 'senior_counselour', 'active'),
        ('Вожатый Тестов', 'counselour@campus.ru', $1, '89001000003', 'counselour', 'active'),
        ('Вожатый Без Отряда', 'free@campus.ru', $1, '89001000004', 'counselour', 'active')
       RETURNING id, email`,
      [hash]
    );
    const byEmail = {};
    users.rows.forEach((u) => { byEmail[u.email] = u.id; });

    const shift = await client.query(
      `INSERT INTO shifts (shift_no, shift_start, shift_end)
       VALUES (1, now() - INTERVAL '1 day', now() + INTERVAL '20 days') RETURNING id`
    );
    await client.query(
      `INSERT INTO users_in_shifts (user_id, shift_id)
       SELECT id, $1 FROM users WHERE status = 'active'`,
      [shift.rows[0].id]
    );

    const squads = await client.query(
      `INSERT INTO squads (title, description, shift_id)
       VALUES ('Тестовый отряд', 'Описание', $1), ('Чужой отряд', 'Описание', $1)
       RETURNING id, title`,
      [shift.rows[0].id]
    );
    const ownSquad = squads.rows.find((s) => s.title === 'Тестовый отряд').id;
    const otherSquad = squads.rows.find((s) => s.title === 'Чужой отряд').id;

    await client.query(
      'INSERT INTO users_in_squads (user_id, squad_id) VALUES ($1, $2)',
      [byEmail['counselour@campus.ru'], ownSquad]
    );

    const children = await client.query(
      `INSERT INTO children (full_name, age, parent_full_name, parent_phone, notes, squad_id) VALUES
        ('Ребёнок Первый', '10', 'Родитель Первый', '89111111111', 'заметка', $1),
        ('Ребёнок Второй', '11', 'Родитель Второй', '89222222222', '', $1),
        ('Ребёнок Чужой', '12', 'Родитель Чужой', '89333333333', '', $2)
       RETURNING id`,
      [ownSquad, otherSquad]
    );

    await client.query(
      `INSERT INTO events (title, description, event_type, time_from, time_to, squad_id) VALUES
        ('Событие сегодня', '', 'general', now() - INTERVAL '1 hour', now() + INTERVAL '1 hour', NULL),
        ('Событие завтра', '', 'quest', now() + INTERVAL '1 day', now() + INTERVAL '1 day 2 hours', NULL)
       RETURNING id`
    );

    await client.query('COMMIT');
    return {
      users: byEmail,
      squads: { own: ownSquad, other: otherSquad },
      children: children.rows.map((c) => c.id),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function closeDb() {
  await pool.end();
}

module.exports = { resetDb, closeDb, PASSWORD };

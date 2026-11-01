'use strict';

/**
 * Seed-данные для разработки и демонстрации.
 * Учётные записи (пароль у всех: Password1!):
 *   director@campus.ru — директор
 *   senior@campus.ru   — старший вожатый
 *   ivan@campus.ru     — вожатый, назначен на отряд «Капельки»
 *   olga@campus.ru     — вожатый без назначения
 */
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT COUNT(*)::int AS n FROM users');
    if (existing.rows[0].n > 0) {
      console.log('[seed] Данные уже есть, пропускаю.');
      return;
    }

    await client.query('BEGIN');
    const hash = await bcrypt.hash('Password1!', 10);

    const users = await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, status)
       VALUES
         ('Директор Лагеря', 'director@campus.ru', $1, '89001000001', 'director', 'active'),
         ('Старшая Вожатая Анна', 'senior@campus.ru', $1, '89001000002', 'senior_counselour', 'active'),
         ('Иванов Иван', 'ivan@campus.ru', $1, '89001000003', 'counselour', 'active'),
         ('Ольга Петрова', 'olga@campus.ru', $1, '89001000004', 'counselour', 'active')
       RETURNING id, email`,
      [hash]
    );
    const byEmail = {};
    users.rows.forEach((u) => { byEmail[u.email] = u.id; });

    const shift = await client.query(
      `INSERT INTO shifts (shift_no, shift_start, shift_end)
       VALUES (1, now() - INTERVAL '2 days', now() + INTERVAL '18 days')
       RETURNING id`
    );
    const shiftId = shift.rows[0].id;

    await client.query(
      `INSERT INTO users_in_shifts (user_id, shift_id)
       SELECT id, $1 FROM users WHERE status = 'active'`,
      [shiftId]
    );

    const squads = await client.query(
      `INSERT INTO squads (title, description, shift_id)
       VALUES ('Капельки', 'Плывём спокойно по течению...', $1),
              ('Соколы', 'Высоко летаем, далеко видим', $1)
       RETURNING id, title`,
      [shiftId]
    );
    const kapelki = squads.rows.find((s) => s.title === 'Капельки').id;
    const sokoly = squads.rows.find((s) => s.title === 'Соколы').id;

    await client.query(
      'INSERT INTO users_in_squads (user_id, squad_id) VALUES ($1, $2)',
      [byEmail['ivan@campus.ru'], kapelki]
    );

    const children = await client.query(
      `INSERT INTO children (full_name, age, parent_full_name, parent_phone, notes, squad_id)
       VALUES
         ('Смирнов Алексей Игоревич', '10', 'Смирнова Елена Андреевна', '89111111111', 'Любит футбол', $1),
         ('Козлова Мария Дмитриевна', '11', 'Козлова Ольга Сергеевна', '89222222222', 'Аллергия на пыльцу', $1),
         ('Никитин Даниил Павлович', '9', 'Никитина Ирина Владимировна', '89333333333', '', $1),
         ('Фёдорова София Андреевна', '12', 'Фёдорова Наталья Игоревна', '89444444444', 'Занимается плаванием', $1),
         ('Белов Артём Сергеевич', '10', 'Белова Марина Олеговна', '89555555555', '', $1),
         ('Громова Вика Олеговна', '11', 'Громова Анна Павловна', '89666666666', '', $2)
       RETURNING id, full_name`,
      [kapelki, sokoly]
    );

    await client.query(
      `INSERT INTO child_tags (child_id, type, info)
       VALUES
         ($1, 'health', 'Аллергия на пыльцу'),
         ($1, 'warning', 'Не подпускать к воде без взрослых'),
         ($2, 'sports', 'Сборная по плаванию')`,
      [
        children.rows.find((c) => c.full_name.startsWith('Козлова')).id,
        children.rows.find((c) => c.full_name.startsWith('Фёдорова')).id,
      ]
    );

    // Мероприятия (события)
    const events = await client.query(
      `INSERT INTO events (title, description, event_type, time_from, time_to, squad_id, created_by)
       VALUES
         ('Утренняя линейка', 'Построение на площади', 'lineup', date_trunc('day', now()) + INTERVAL '8 hours', date_trunc('day', now()) + INTERVAL '8 hours 30 minutes', NULL, $1),
         ('Футбольный турнир', 'Матчи между отрядами', 'football', date_trunc('day', now()) + INTERVAL '15 hours', date_trunc('day', now()) + INTERVAL '17 hours', NULL, $1),
         ('Творческий квест', 'Квест по территории лагеря', 'quest', date_trunc('day', now()) + INTERVAL '1 day 12 hours', date_trunc('day', now()) + INTERVAL '1 day 14 hours', $2, $1)
       RETURNING id, title, squad_id`,
      [byEmail['senior@campus.ru'], kapelki]
    );

    // Автосоздание посещаемости для всех детей (события общие/отрядные)
    for (const ev of events.rows) {
      if (ev.squad_id) {
        await client.query(
          `INSERT INTO event_attendance (event_id, child_id)
           SELECT $1, id FROM children WHERE squad_id = $2 AND deleted_at IS NULL`,
          [ev.id, ev.squad_id]
        );
      } else {
        await client.query(
          `INSERT INTO event_attendance (event_id, child_id)
           SELECT $1, id FROM children WHERE deleted_at IS NULL`,
          [ev.id]
        );
      }
    }

    await client.query(
      `INSERT INTO notifications (title, description, kind, created_by)
       VALUES
         ('Начало смены', 'Смена №1 официально открыта. Расписание в разделе «Журнал».', 'important', $1),
         ('Футбольный турнир', 'Сегодня в 15:00 футбольный турнир между отрядами.', 'info', $1),
         ('Отметьте посещаемость', 'Не забудьте отметить детей на утренней линейке.', 'info', $1)`,
      [byEmail['senior@campus.ru']]
    );

    await client.query(
      `INSERT INTO messages (message, sender_id) VALUES
        ('Всем привет! Смена началась, вопросы — в этот чат.', $1),
        ('Привет! Где берём футбольные мячи?', $2)`,
      [byEmail['senior@campus.ru'], byEmail['ivan@campus.ru']]
    );

    await client.query('COMMIT');
    console.log('[seed] Готово. Пароль всех учётных записей: Password1!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[seed] Ошибка:', err);
      pool.end().then(() => process.exit(1));
    });
}

module.exports = seed;

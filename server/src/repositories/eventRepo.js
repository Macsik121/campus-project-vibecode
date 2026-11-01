'use strict';

const pool = require('../db/pool');

function mapRow(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    eventType: r.event_type,
    timeFrom: r.time_from,
    timeTo: r.time_to,
    squadId: r.squad_id,
  };
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create({ title, description = '', eventType = 'general', timeFrom, timeTo, squadId = null, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO events (title, description, event_type, time_from, time_to, squad_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, description, eventType, timeFrom, timeTo, squadId, createdBy]
  );
  return rows[0];
}

/**
 * Список событий.
 * Фильтр Журнала из ТЗ: выбранная дата и текущая образуют интервал
 * [min(date,today), max(date,today)]; событие должно ПОЛНОСТЬЮ входить в него.
 */
async function list({ date = null, limit = 10 }) {
  if (date) {
    const { rows } = await pool.query(
      `SELECT * FROM events
       WHERE time_from >= LEAST($1::date, now()::date)
         AND time_to   <= (GREATEST($1::date, now()::date) + INTERVAL '1 day')
       ORDER BY time_from DESC
       LIMIT $2`,
      [date, limit]
    );
    return rows.map(mapRow);
  }
  const { rows } = await pool.query(
    'SELECT * FROM events ORDER BY time_from DESC LIMIT $1',
    [limit]
  );
  return rows.map(mapRow);
}

async function update(id, { title, description, eventType, timeFrom, timeTo }) {
  const { rows } = await pool.query(
    `UPDATE events SET
       title       = COALESCE($2, title),
       description = COALESCE($3, description),
       event_type  = COALESCE($4, event_type),
       time_from   = COALESCE($5, time_from),
       time_to     = COALESCE($6, time_to)
     WHERE id = $1 RETURNING *`,
    [id, title, description, eventType, timeFrom, timeTo]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

/** Автосоздание строк посещаемости для детей отряда (ERD: создаётся при создании Event) */
async function createAttendanceRows(eventId, squadId = null) {
  if (squadId) {
    await pool.query(
      `INSERT INTO event_attendance (event_id, child_id)
       SELECT $1, id FROM children WHERE squad_id = $2 AND deleted_at IS NULL
       ON CONFLICT (event_id, child_id) DO NOTHING`,
      [eventId, squadId]
    );
  } else {
    await pool.query(
      `INSERT INTO event_attendance (event_id, child_id)
       SELECT $1, id FROM children WHERE deleted_at IS NULL
       ON CONFLICT (event_id, child_id) DO NOTHING`,
      [eventId]
    );
  }
}

module.exports = { findById, create, list, update, remove, createAttendanceRows, mapRow };

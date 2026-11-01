'use strict';

const pool = require('../db/pool');

/** Ids детей, отмеченных присутствующими на событии (опционально в рамках отряда) */
async function presentChildIds(eventId, squadId = null) {
  const params = [eventId];
  let extra = '';
  if (squadId) {
    params.push(squadId);
    extra = 'AND c.squad_id = $2';
  }
  const { rows } = await pool.query(
    `SELECT ea.child_id FROM event_attendance ea
     JOIN children c ON c.id = ea.child_id
     WHERE ea.event_id = $1 AND ea.is_present = true ${extra}`,
    params
  );
  return rows.map((r) => r.child_id);
}

async function getRow(eventId, childId) {
  const { rows } = await pool.query(
    'SELECT * FROM event_attendance WHERE event_id = $1 AND child_id = $2',
    [eventId, childId]
  );
  return rows[0] || null;
}

async function setPresent(eventId, childId, present, markedBy) {
  const { rows } = await pool.query(
    `UPDATE event_attendance
     SET is_present = $3, marked_by = $4, marked_at = now()
     WHERE event_id = $1 AND child_id = $2 RETURNING *`,
    [eventId, childId, present, markedBy]
  );
  return rows[0] || null;
}

async function insertRow(eventId, childId, present, markedBy) {
  const { rows } = await pool.query(
    `INSERT INTO event_attendance (event_id, child_id, is_present, marked_by, marked_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (event_id, child_id) DO NOTHING RETURNING *`,
    [eventId, childId, present, markedBy]
  );
  return rows[0] || null;
}

module.exports = { presentChildIds, getRow, setPresent, insertRow };

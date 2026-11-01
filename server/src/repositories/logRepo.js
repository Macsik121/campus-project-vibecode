'use strict';

const pool = require('../db/pool');

async function add({ causedBy, event, method = null, path = null, meta = null }) {
  const { rows } = await pool.query(
    `INSERT INTO action_logs (caused_by, event, method, path, meta)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [causedBy, event, method, path, meta ? JSON.stringify(meta) : null]
  );
  return rows[0];
}

async function list({ limit = 50, offset = 0 }) {
  const { rows } = await pool.query(
    `SELECT l.id, l.event, l.method, l.path, l.meta, l.created_at,
            u.full_name AS caused_by_name, u.id AS caused_by
     FROM action_logs l
     LEFT JOIN users u ON u.id = l.caused_by
     ORDER BY l.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

module.exports = { add, list };

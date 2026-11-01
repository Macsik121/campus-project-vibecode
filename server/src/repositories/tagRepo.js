'use strict';

const pool = require('../db/pool');

const TAG_TYPES = ['warning', 'alert', 'health', 'sports'];

async function byChild(childId) {
  const { rows } = await pool.query(
    'SELECT id, type, info FROM child_tags WHERE child_id = $1 ORDER BY id',
    [childId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM child_tags WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(childId, type, info) {
  const { rows } = await pool.query(
    'INSERT INTO child_tags (child_id, type, info) VALUES ($1, $2, $3) RETURNING *',
    [childId, type, info]
  );
  return rows[0];
}

async function update(id, type, info) {
  const { rows } = await pool.query(
    'UPDATE child_tags SET type = $2, info = $3 WHERE id = $1 RETURNING *',
    [id, type, info]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rows } = await pool.query('DELETE FROM child_tags WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

module.exports = { TAG_TYPES, byChild, findById, create, update, remove };

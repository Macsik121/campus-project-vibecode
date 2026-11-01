'use strict';

const pool = require('../db/pool');

function mapRow(row, tags = []) {
  return {
    id: row.id,
    fullName: row.full_name,
    age: row.age,
    parentFullName: row.parent_full_name,
    parentPhone: row.parent_phone,
    notes: row.notes,
    tags,
  };
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM children WHERE id = $1 AND deleted_at IS NULL', [id]);
  return rows[0] || null;
}

async function tagsOf(childId) {
  const { rows } = await pool.query(
    'SELECT id, type, info FROM child_tags WHERE child_id = $1 ORDER BY id',
    [childId]
  );
  return rows;
}

async function bySquad(squadId) {
  const { rows } = await pool.query(
    'SELECT * FROM children WHERE squad_id = $1 AND deleted_at IS NULL ORDER BY full_name',
    [squadId]
  );
  const result = [];
  for (const row of rows) {
    result.push(mapRow(row, await tagsOf(row.id)));
  }
  return result;
}

async function detached() {
  const { rows } = await pool.query(
    'SELECT * FROM children WHERE squad_id IS NULL AND deleted_at IS NULL ORDER BY full_name'
  );
  const result = [];
  for (const row of rows) {
    result.push(mapRow(row, await tagsOf(row.id)));
  }
  return result;
}

async function create({ fullName, age, parentFullName, parentPhone, notes = '', squadId = null }) {
  const { rows } = await pool.query(
    `INSERT INTO children (full_name, age, parent_full_name, parent_phone, notes, squad_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [fullName, age, parentFullName, parentPhone, notes, squadId]
  );
  return rows[0];
}

async function update(id, { fullName, age, parentFullName, parentPhone, notes }) {
  const { rows } = await pool.query(
    `UPDATE children SET
       full_name        = COALESCE($2, full_name),
       age              = COALESCE($3, age),
       parent_full_name = COALESCE($4, parent_full_name),
       parent_phone     = COALESCE($5, parent_phone),
       notes            = COALESCE($6, notes)
     WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id, fullName, age, parentFullName, parentPhone, notes]
  );
  return rows[0] || null;
}

/** Soft-delete (ТЗ: «в системе будет только пометка об этом») + отвязка от отряда */
async function softDelete(id) {
  const { rows } = await pool.query(
    'UPDATE children SET deleted_at = now(), squad_id = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [id]
  );
  return rows[0] || null;
}

async function attachToSquad(childId, squadId) {
  const { rows } = await pool.query(
    'UPDATE children SET squad_id = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING *',
    [childId, squadId]
  );
  return rows[0] || null;
}

async function detachFromSquad(childId) {
  const { rows } = await pool.query(
    'UPDATE children SET squad_id = NULL WHERE id = $1 AND deleted_at IS NULL RETURNING *',
    [childId]
  );
  return rows[0] || null;
}

module.exports = {
  findById, tagsOf, bySquad, detached, create, update,
  softDelete, attachToSquad, detachFromSquad, mapRow,
};

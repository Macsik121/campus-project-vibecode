'use strict';

const pool = require('../db/pool');

async function create({ title, description }, shiftId = null) {
  const { rows } = await pool.query(
    'INSERT INTO squads (title, description, shift_id) VALUES ($1, $2, $3) RETURNING *',
    [title, description || null, shiftId]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM squads WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listAll() {
  const { rows } = await pool.query(
    `SELECT s.*,
       (SELECT COUNT(*)::int FROM children c WHERE c.squad_id = s.id AND c.deleted_at IS NULL) AS children_count,
       (SELECT json_agg(json_build_object('id', u.id, 'fullName', u.full_name))
          FROM users_in_squads uis JOIN users u ON u.id = uis.user_id WHERE uis.squad_id = s.id) AS counselours
     FROM squads s ORDER BY s.created_at`
  );
  return rows;
}

/** Отряд, на который назначен вожатый (users_in_squads, M2M по ERD) */
async function squadOfUser(userId) {
  const { rows } = await pool.query(
    `SELECT s.* FROM squads s
     JOIN users_in_squads uis ON uis.squad_id = s.id
     WHERE uis.user_id = $1
     ORDER BY uis.assigned_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function isAssigned(userId, squadId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM users_in_squads WHERE user_id = $1 AND squad_id = $2',
    [userId, squadId]
  );
  return rows.length > 0;
}

/** Переназначение вожатого: убирает старую привязку, ставит новую. Возвращает старый squadId. */
async function reassignUser(userId, squadId) {
  const old = await squadOfUser(userId);
  await pool.query('DELETE FROM users_in_squads WHERE user_id = $1', [userId]);
  await pool.query(
    'INSERT INTO users_in_squads (user_id, squad_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, squadId]
  );
  return old ? old.id : null;
}

module.exports = { create, findById, listAll, squadOfUser, isAssigned, reassignUser };

'use strict';

const pool = require('../db/pool');

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0] || null;
}

async function create({ fullName, email, passwordHash, phoneNumber = null, role = 'counselour', status = 'pending' }) {
  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, phone_number, role, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [fullName, email, passwordHash, phoneNumber, role, status]
  );
  return rows[0];
}

async function updateProfile(id, { fullName, email, phoneNumber, avatarUrl }) {
  const { rows } = await pool.query(
    `UPDATE users SET
       full_name    = COALESCE($2, full_name),
       email        = COALESCE($3, email),
       phone_number = COALESCE($4, phone_number),
       avatar_url   = COALESCE($5, avatar_url)
     WHERE id = $1 RETURNING *`,
    [id, fullName, email, phoneNumber, avatarUrl]
  );
  return rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  const { rows } = await pool.query(
    'UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id',
    [id, passwordHash]
  );
  return rows[0] || null;
}

async function setStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE users SET status = $2 WHERE id = $1 RETURNING *',
    [id, status]
  );
  return rows[0] || null;
}

async function isOnActiveShift(userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM users_in_shifts uis
     JOIN shifts s ON s.id = uis.shift_id
     WHERE uis.user_id = $1 AND now() BETWEEN s.shift_start AND s.shift_end
     LIMIT 1`,
    [userId]
  );
  return rows.length > 0;
}

async function addToShift(userId, shiftId) {
  await pool.query(
    'INSERT INTO users_in_shifts (user_id, shift_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, shiftId]
  );
}

async function currentShift() {
  const { rows } = await pool.query(
    'SELECT * FROM shifts WHERE now() BETWEEN shift_start AND shift_end ORDER BY shift_start DESC LIMIT 1'
  );
  return rows[0] || null;
}

module.exports = {
  findById, findByEmail, create, updateProfile, updatePassword,
  setStatus, isOnActiveShift, addToShift, currentShift,
};

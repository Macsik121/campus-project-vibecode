'use strict';

const pool = require('../db/pool');

async function create(userId) {
  const { rows } = await pool.query(
    'INSERT INTO counselor_applications (user_id) VALUES ($1) RETURNING *',
    [userId]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM counselor_applications WHERE id = $1', [id]);
  return rows[0] || null;
}

async function list(status = null) {
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = 'WHERE a.status = $1';
  }
  const { rows } = await pool.query(
    `SELECT a.*, u.full_name, u.email, u.phone_number, u.role AS user_role,
            r.full_name AS reviewer_name
     FROM counselor_applications a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN users r ON r.id = a.reviewed_by
     ${where}
     ORDER BY a.created_at DESC`,
    params
  );
  return rows;
}

async function review(id, { status, rejectReason = null, reviewedBy }) {
  const { rows } = await pool.query(
    `UPDATE counselor_applications
     SET status = $2, reject_reason = $3, reviewed_by = $4, reviewed_at = now()
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, status, rejectReason, reviewedBy]
  );
  return rows[0] || null;
}

async function rejectAllPending({ reason, reviewedBy }) {
  const { rows } = await pool.query(
    `UPDATE counselor_applications
     SET status = 'rejected', reject_reason = $1, reviewed_by = $2, reviewed_at = now()
     WHERE status = 'pending' RETURNING user_id`,
    [reason, reviewedBy]
  );
  return rows.map((r) => r.user_id);
}

module.exports = { create, findById, list, review, rejectAllPending };

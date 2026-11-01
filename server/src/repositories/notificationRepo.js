'use strict';

const pool = require('../db/pool');

async function create({ title, description, kind = 'info', createdBy = null }) {
  const { rows } = await pool.query(
    'INSERT INTO notifications (title, description, kind, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
    [title, description, kind, createdBy]
  );
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
  return rows[0] || null;
}

/** Последние N уведомлений с флагом isRead для конкретного пользователя */
async function listForUser(userId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT n.id, n.title, n.description, n.kind, n.sent_at AS "sentAt",
            (r.user_id IS NOT NULL) AS "isRead"
     FROM notifications n
     LEFT JOIN notifications_read_by_users r ON r.notif_id = n.id AND r.user_id = $1
     ORDER BY n.sent_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function unreadCount(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM notifications n
     WHERE NOT EXISTS (
       SELECT 1 FROM notifications_read_by_users r WHERE r.notif_id = n.id AND r.user_id = $1
     )`,
    [userId]
  );
  return rows[0].n;
}

async function markRead(notifId, userId) {
  await pool.query(
    `INSERT INTO notifications_read_by_users (notif_id, user_id) VALUES ($1, $2)
     ON CONFLICT (notif_id, user_id) DO NOTHING`,
    [notifId, userId]
  );
}

async function markAllRead(userId) {
  await pool.query(
    `INSERT INTO notifications_read_by_users (notif_id, user_id)
     SELECT n.id, $1 FROM notifications n
     ON CONFLICT (notif_id, user_id) DO NOTHING`,
    [userId]
  );
}

async function update(id, { title, description }) {
  const { rows } = await pool.query(
    `UPDATE notifications SET
       title = COALESCE($2, title),
       description = COALESCE($3, description)
     WHERE id = $1 RETURNING *`,
    [id, title, description]
  );
  return rows[0] || null;
}

/** После редактирования уведомление снова становится непрочитанным для всех (по Swagger) */
async function resetReads(id) {
  await pool.query('DELETE FROM notifications_read_by_users WHERE notif_id = $1', [id]);
}

async function remove(id) {
  const { rows } = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

module.exports = {
  create, findById, listForUser, unreadCount, markRead, markAllRead, update, resetReads, remove,
};

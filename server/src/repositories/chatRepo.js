'use strict';

const pool = require('../db/pool');

async function add(senderId, message) {
  const { rows } = await pool.query(
    'INSERT INTO messages (message, sender_id) VALUES ($1, $2) RETURNING *',
    [message, senderId]
  );
  return rows[0];
}

async function list(limit = 50) {
  const { rows } = await pool.query(
    `SELECT m.id, m.message, m.sent_at AS "sentAt",
            u.id AS "senderId", u.full_name AS "senderName", u.role AS "senderRole"
     FROM messages m JOIN users u ON u.id = m.sender_id
     ORDER BY m.sent_at DESC LIMIT $1`,
    [limit]
  );
  return rows.reverse();
}

module.exports = { add, list };

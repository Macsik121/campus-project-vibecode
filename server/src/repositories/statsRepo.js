'use strict';

const pool = require('../db/pool');

/** Статистика по текущей смене для директора */
async function shiftStats() {
  const shift = await pool.query(
    'SELECT * FROM shifts WHERE now() BETWEEN shift_start AND shift_end ORDER BY shift_start DESC LIMIT 1'
  );
  const current = shift.rows[0] || null;
  const bounds = current
    ? [current.shift_start, current.shift_end]
    : ['-infinity', 'infinity'];

  const eventsByType = await pool.query(
    `SELECT event_type, COUNT(*)::int AS count FROM events
     WHERE time_from BETWEEN $1 AND $2
     GROUP BY event_type ORDER BY count DESC`,
    bounds
  );

  const attendance = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE is_present)::int AS present,
       COUNT(*)::int AS total
     FROM event_attendance ea
     JOIN events e ON e.id = ea.event_id
     WHERE e.time_from BETWEEN $1 AND $2`,
    bounds
  );

  const logsByMethod = await pool.query(
    `SELECT method, COUNT(*)::int AS count FROM action_logs
     WHERE created_at BETWEEN $1 AND $2
     GROUP BY method ORDER BY count DESC`,
    bounds
  );

  const warnings = await pool.query(
    `SELECT l.id, l.event, l.path, l.created_at, u.full_name AS caused_by_name
     FROM action_logs l LEFT JOIN users u ON u.id = l.caused_by
     WHERE l.created_at BETWEEN $1 AND $2
       AND (l.event ILIKE '%удал%' OR l.event ILIKE '%отклон%' OR l.path ILIKE '%delete%')
     ORDER BY l.created_at DESC LIMIT 20`,
    bounds
  );

  return {
    shift: current
      ? { id: current.id, shiftNo: current.shift_no, start: current.shift_start, end: current.shift_end }
      : null,
    eventsByType: eventsByType.rows,
    attendance: attendance.rows[0],
    logsByMethod: logsByMethod.rows,
    warnings: warnings.rows,
  };
}

module.exports = { shiftStats };

'use strict';

const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const applied = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (applied.rowCount > 0) continue;

      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`[migrate] Применяю ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] ${file} — OK`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log('[migrate] Все миграции применены.');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[migrate] Ошибка:', err);
      pool.end().then(() => process.exit(1));
    });
}

module.exports = migrate;

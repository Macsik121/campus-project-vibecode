'use strict';

const { Pool } = require('pg');
const config = require('../config');

// TLS к БД явно НЕ включается: внутри docker-сети postgres без TLS, и активный
// ssl-режим даёт ошибку "The server does not support SSL connections".
// Если БД с TLS (managed-хостинг) — задайте отдельно DATABASE_SSL=true.
const useSsl = String(process.env.DATABASE_SSL || '') === 'true';

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => {
  console.error('[db] Неожиданная ошибка idle-клиента пула:', err.message);
});

module.exports = pool;

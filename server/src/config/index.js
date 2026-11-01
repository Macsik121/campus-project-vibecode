'use strict';

require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'campus-dev-secret-do-not-use-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  baseDbType: (process.env.BASE_DB_TYPE || 'postgres').toLowerCase(),
  databaseUrl: process.env.DATABASE_URL || 'postgres://campus:campus@localhost:5432/campus',
};

if (config.baseDbType !== 'postgres') {
  // ТЗ: BASE_DB_TYPE нужен для шаблона Repository. В MVP поддержан postgres.
  console.warn(`[config] BASE_DB_TYPE=${config.baseDbType}: поддерживается только postgres, используем postgres.`);
  config.baseDbType = 'postgres';
}

module.exports = config;

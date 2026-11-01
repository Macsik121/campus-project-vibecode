'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errors');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'campus-api' }));

  // Swagger UI (ТЗ: при разработке сервера использовался Swagger).
  // Локально: <repo>/server/src -> <repo>/docs/swagger.yaml (../../docs).
  // В контейнере: /app/src -> /app/docs/swagger.yaml (../docs, см. server/Dockerfile).
  const swaggerPath = [
    path.join(__dirname, '..', '..', 'docs', 'swagger.yaml'),
    path.join(__dirname, '..', 'docs', 'swagger.yaml'),
  ].find((p) => fs.existsSync(p));

  try {
    if (!swaggerPath) throw new Error('swagger.yaml не найден ни в ../../docs, ни в ../docs');
    const swaggerDoc = YAML.load(swaggerPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  } catch (err) {
    console.warn('[app] swagger.yaml не найден, /api-docs отключён:', err.message);
  }

  app.use('/api/v1', routes);

  app.use((_req, _res, next) => next(notFound('ROUTE_NOT_FOUND', 'Маршрут не найден')));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;

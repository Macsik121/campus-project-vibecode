'use strict';

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

  // Swagger UI (ТЗ: при разработке сервера использовался Swagger)
  try {
    const swaggerDoc = YAML.load(path.join(__dirname, '../../docs/swagger.yaml'));
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

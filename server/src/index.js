'use strict';

const http = require('http');
const config = require('./config');
const createApp = require('./app');
const migrate = require('./db/migrate');
const sockets = require('./sockets');

async function main() {
  await migrate();

  const app = createApp();
  const server = http.createServer(app);
  sockets.init(server);

  server.listen(config.port, () => {
    console.log(`[server] CAMPUS API: http://localhost:${config.port}/api/v1`);
    console.log(`[server] Swagger UI: http://localhost:${config.port}/api-docs`);
  });
}

main().catch((err) => {
  console.error('[server] Ошибка запуска:', err);
  process.exit(1);
});

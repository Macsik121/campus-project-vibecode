'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

let io = null;

/**
 * Socket.io: JWT-аутентификация на handshake (auth.token).
 * События MVP: notification:new (broadcast), chat:message (broadcast).
 */
function init(httpServer) {
  const { Server } = require('socket.io');
  io = new Server(httpServer, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      socket.user = { id: payload.userId, role: payload.role };
      next();
    } catch (_e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join('broadcast');
    console.log(`[socket] Подключился пользователь ${socket.user.id}`);
  });

  return io;
}

function emitToAll(event, payload) {
  if (io) io.to('broadcast').emit(event, payload);
}

module.exports = { init, emitToAll };

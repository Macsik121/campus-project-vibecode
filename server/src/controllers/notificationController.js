'use strict';

const notificationService = require('../services/notificationService');

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

const list = wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const { unreadCount, items } = await notificationService.listForUser(req.user, limit);
  res.json({ unreadCount, items });
});

const create = wrap(async (req, res) => {
  const notif = await notificationService.createManual(req.user, req.body);
  res.status(201).json(notif);
});

const read = wrap(async (req, res) => {
  res.status(201).json(await notificationService.markRead(req.user, req.body.notifId));
});

const readAll = wrap(async (req, res) => {
  res.json(await notificationService.markAllRead(req.user));
});

const update = wrap(async (req, res) => {
  res.json(await notificationService.update(req.user, req.body));
});

const remove = wrap(async (req, res) => {
  await notificationService.remove(req.query.notificationId);
  res.status(204).send();
});

module.exports = { list, create, read, readAll, update, remove };

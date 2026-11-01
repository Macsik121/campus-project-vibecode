'use strict';

const notificationRepo = require('../repositories/notificationRepo');
const sockets = require('../sockets');
const { notFound, badRequest } = require('../middleware/errors');
const { requireFields, validateUuid } = require('../middleware/validate');

/** Создание уведомления + realtime-рассылка всем подключённым (socket.io) */
async function notifyAll({ title, description, kind = 'info', createdBy = null }) {
  const notif = await notificationRepo.create({ title, description, kind, createdBy });
  sockets.emitToAll('notification:new', {
    id: notif.id,
    title: notif.title,
    description: notif.description,
    kind: notif.kind,
    sentAt: notif.sent_at,
  });
  return notif;
}

async function createManual(user, { title, description, kind = 'info' }) {
  requireFields({ title, description }, ['title', 'description']);
  if (!['info', 'important', 'map'].includes(kind)) {
    throw badRequest('VALIDATION', 'Некорректный тип уведомления (info|important|map)');
  }
  return notifyAll({ title, description, kind, createdBy: user.id });
}

async function listForUser(user, limit = 20) {
  const items = await notificationRepo.listForUser(user.id, limit);
  const unreadCount = await notificationRepo.unreadCount(user.id);
  return { unreadCount, items };
}

async function markRead(user, notifId) {
  validateUuid(notifId, 'notifId');
  const notif = await notificationRepo.findById(notifId);
  if (!notif) throw notFound('NOTIF_NOT_FOUND', 'Нет такого уведомления');
  await notificationRepo.markRead(notifId, user.id);
  return { notifId, message: 'Read successfully' };
}

async function markAllRead(user) {
  await notificationRepo.markAllRead(user.id);
  return { message: 'All notifications marked as read' };
}

async function update(user, { id, title, description }) {
  requireFields({ id }, ['id']);
  validateUuid(id, 'id');
  const updated = await notificationRepo.update(id, { title, description });
  if (!updated) throw notFound('NOTIF_NOT_FOUND', 'Уведомление с указанным id не найдено');
  // По Swagger: после редактирования помечается непрочитанным для всех
  await notificationRepo.resetReads(id);
  sockets.emitToAll('notification:new', {
    id: updated.id, title: updated.title, description: updated.description,
    kind: updated.kind, sentAt: updated.sent_at,
  });
  return updated;
}

async function remove(notificationId) {
  validateUuid(notificationId, 'notificationId');
  const deleted = await notificationRepo.remove(notificationId);
  if (!deleted) throw notFound('NOTIF_NOT_FOUND', 'Уведомление с указанным id не найдено');
}

module.exports = { notifyAll, createManual, listForUser, markRead, markAllRead, update, remove };

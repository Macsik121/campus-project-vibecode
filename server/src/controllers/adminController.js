'use strict';

const applicationService = require('../services/applicationService');
const logRepo = require('../repositories/logRepo');
const statsRepo = require('../repositories/statsRepo');
const chatRepo = require('../repositories/chatRepo');
const sockets = require('../sockets');
const { badRequest } = require('../middleware/errors');
const { requireFields } = require('../middleware/validate');

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

const applications = wrap(async (req, res) => {
  res.json(await applicationService.list(req.query.status));
});

const approveApplication = wrap(async (req, res) => {
  res.json(await applicationService.approve(req.user, req.params.id));
});

const rejectApplication = wrap(async (req, res) => {
  res.json(await applicationService.reject(req.user, req.params.id, req.body.reason));
});

const rejectAllApplications = wrap(async (req, res) => {
  res.json(await applicationService.rejectAll(req.user, req.body.reason));
});

const logs = wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  res.json(await logRepo.list({ limit, offset }));
});

const stats = wrap(async (_req, res) => {
  res.json(await statsRepo.shiftStats());
});

const chatHistory = wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  res.json(await chatRepo.list(limit));
});

const chatSend = wrap(async (req, res) => {
  requireFields(req.body, ['message']);
  const text = String(req.body.message).trim();
  if (!text) throw badRequest('VALIDATION', 'Сообщение не должно быть пустым');
  const saved = await chatRepo.add(req.user.id, text);
  const payload = {
    id: saved.id,
    message: saved.message,
    sentAt: saved.sent_at,
    senderId: req.user.id,
    senderName: req.user.fullName,
    senderRole: req.user.role,
  };
  sockets.emitToAll('chat:message', payload);
  res.status(201).json(payload);
});

module.exports = {
  applications, approveApplication, rejectApplication, rejectAllApplications,
  logs, stats, chatHistory, chatSend,
};

'use strict';

const authService = require('../services/authService');
const { isSeniorOrUp } = require('../middleware/roles');

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

const login = wrap(async (req, res) => {
  const result = await authService.login(req.body);
  res.json(result);
});

const register = wrap(async (req, res) => {
  const result = await authService.register(req.body);
  res.json(result);
});

const verifyJwt = wrap(async (req, res) => {
  res.json({ valid: true, userId: req.user.id, role: req.user.role });
});

const verifySenior = wrap(async (req, res) => {
  if (!isSeniorOrUp(req.user)) {
    return res.status(403).json({ error: { code: 'NOT_SENIOR', message: 'Прав не достаточно. Человек обычный вожатый.' } });
  }
  res.json({ sufficient: true });
});

const verifyDirector = wrap(async (req, res) => {
  if (req.user.role !== 'director') {
    return res.status(403).json({ error: { code: 'NOT_DIRECTOR', message: 'Прав не достаточно. Человек обычный или старший вожатый.' } });
  }
  res.json({ sufficient: true });
});

module.exports = { login, register, verifyJwt, verifySenior, verifyDirector };

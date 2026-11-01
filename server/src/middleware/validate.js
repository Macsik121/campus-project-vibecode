'use strict';

const { badRequest } = require('./errors');

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.]+$/;
/** Пароль: не менее 6 символов и хотя бы 1 спецсимвол (не буква/цифра) */
const PASSWORD_RE = /^(?=.*[^A-Za-z0-9]).{6,}$/;

function validateEmail(email, field = 'email') {
  if (!email || typeof email !== 'string') throw badRequest('VALIDATION', `Поле ${field} не должно быть пустым`);
  if (!EMAIL_RE.test(email)) throw badRequest('VALIDATION', `Поле ${field} не является корректной почтой`);
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') throw badRequest('VALIDATION', 'Пароль не должен быть пустым');
  if (!PASSWORD_RE.test(password)) {
    throw badRequest('VALIDATION', 'Пароль должен быть не короче 6 символов и содержать хотя бы 1 спецсимвол');
  }
}

function requireFields(body, fields) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      throw badRequest('VALIDATION', `Поле ${f} обязательно`);
    }
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateUuid(value, field = 'id') {
  if (!value || !UUID_RE.test(value)) throw badRequest('VALIDATION', `Поле ${field} должно быть UUID`);
}

module.exports = { validateEmail, validatePassword, requireFields, validateUuid, EMAIL_RE, PASSWORD_RE };

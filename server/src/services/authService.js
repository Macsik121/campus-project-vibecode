'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepo = require('../repositories/userRepo');
const applicationRepo = require('../repositories/applicationRepo');
const { badRequest, unauthorized, forbidden } = require('../middleware/errors');
const { validateEmail, validatePassword, requireFields } = require('../middleware/validate');

function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

/**
 * Регистрация: создаёт пользователя со статусом pending и заявку вожатого.
 * Заявку одобряет директор/старший вожатый (см. ТЗ «Форма регистрации»).
 */
async function register({ name, email, password }) {
  requireFields({ name, email, password }, ['name', 'email', 'password']);
  validateEmail(email);
  validatePassword(password);

  const existing = await userRepo.findByEmail(email);
  if (existing) throw badRequest('EMAIL_TAKEN', 'Пользователь с данной почтой уже существует');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepo.create({ fullName: name, email, passwordHash });
  await applicationRepo.create(user.id);
  return { userId: user.id, message: 'Заявка на регистрацию подана. Ожидайте одобрения директором.' };
}

async function login({ email, password }) {
  requireFields({ email, password }, ['email', 'password']);
  validateEmail(email);

  const user = await userRepo.findByEmail(email);
  if (!user) throw unauthorized('Неверный логин или пароль');

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw unauthorized('Неверный логин или пароль');

  if (user.status === 'pending') {
    throw forbidden('ACCOUNT_PENDING', 'Ваша заявка на регистрацию ещё не одобрена');
  }
  if (user.status === 'rejected') {
    throw forbidden('ACCOUNT_REJECTED', 'Аккаунт отклонён или удалён. Обратитесь к старшему вожатому');
  }

  return { token: signToken(user) };
}

module.exports = { register, login, signToken };

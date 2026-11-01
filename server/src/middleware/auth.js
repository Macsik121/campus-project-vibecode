'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized, forbidden } = require('./errors');
const userRepo = require('../repositories/userRepo');

/**
 * authMiddleware — валидация токена по ТЗ:
 * 1) jwt.verify с секретной строкой;
 * 2) пользователь существует и активен (одобренная заявка);
 * 3) пользователь числится на активной смене (users_in_shifts).
 * Директор освобождён от проверки смены.
 */
async function authMiddleware(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw unauthorized('Отсутствует заголовок Authorization: Bearer <token>');
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (_e) {
      throw unauthorized('Токен недействителен или истёк');
    }

    const user = await userRepo.findById(payload.userId);
    if (!user) throw unauthorized('Пользователь не найден');
    if (user.status === 'pending') {
      throw forbidden('ACCOUNT_PENDING', 'Ваша заявка на регистрацию ещё не одобрена');
    }
    if (user.status === 'rejected') {
      throw forbidden('ACCOUNT_REJECTED', 'Аккаунт отклонён или удалён. Обратитесь к старшему вожатому');
    }

    if (user.role !== 'director') {
      const onShift = await userRepo.isOnActiveShift(user.id);
      if (!onShift) {
        throw forbidden('NOT_ON_SHIFT', 'Вожатый не числится на активной смене');
      }
    }

    req.user = { id: user.id, fullName: user.full_name, email: user.email, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;

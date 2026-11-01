'use strict';

const { forbidden } = require('./errors');

const SENIOR_AND_UP = ['senior_counselour', 'director'];

/** Доступ для старшего вожатого и директора (иерархия из use-case диаграммы: Admin extends Child) */
function requireSenior(req, _res, next) {
  if (!req.user || !SENIOR_AND_UP.includes(req.user.role)) {
    return next(forbidden('NOT_SENIOR', 'Нужны права старшего вожатого или директора'));
  }
  next();
}

/** Доступ только для директора */
function requireDirector(req, _res, next) {
  if (!req.user || req.user.role !== 'director') {
    return next(forbidden('NOT_DIRECTOR', 'Нужны права директора'));
  }
  next();
}

const isSeniorOrUp = (user) => SENIOR_AND_UP.includes(user.role);

module.exports = { requireSenior, requireDirector, isSeniorOrUp };

'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const { requireSenior, requireDirector } = require('../middleware/roles');
const log = require('../middleware/logger');

const authCtrl = require('../controllers/authController');
const squadCtrl = require('../controllers/squadController');
const notifCtrl = require('../controllers/notificationController');
const eventCtrl = require('../controllers/eventController');
const userCtrl = require('../controllers/userController');
const adminCtrl = require('../controllers/adminController');
const tagCtrl = require('../controllers/tagController');

const router = express.Router();

/**
 * Middleware-матрица по ТЗ «Требования к API → Логирование»:
 *  - публичные /login, /register: без auth, с Logger
 *  - Read (GET): auth, без Logger
 *  - Create/Update/Delete: auth + Logger (+ проверка прав senior/director где указано)
 */

// ---- auth ----
router.post('/auth/login', log('Вход пользователя'), authCtrl.login);
router.post('/auth/register', log('Регистрация пользователя (заявка)'), authCtrl.register);
router.get('/auth/verify-jwt', auth, authCtrl.verifyJwt);
router.get('/auth/verify-senior-counselour-rights', auth, authCtrl.verifySenior);
router.get('/auth/verify-director-rights', auth, authCtrl.verifyDirector);

// ---- users / profile ----
router.get('/users/squad', auth, squadCtrl.mySquad);
router.get('/users/profile', auth, userCtrl.profile);
router.put('/users/profile', auth, log('Изменение данных пользователя'), userCtrl.updateProfile);
router.put('/users/password', auth, log('Изменение пароля пользователя'), userCtrl.changePassword);

// ---- squads ----
router.get('/squads', auth, squadCtrl.listSquads);
router.post('/squads', auth, requireSenior, log('Добавление отряда'), squadCtrl.createSquads);
router.post('/squads/reassign-user', auth, requireSenior, log('Назначение Вожатого на Отряд'), squadCtrl.reassignUser);
router.get('/squads/:squadId/children', auth, squadCtrl.childrenOfSquad);

// ---- children ----
router.post('/children', auth, requireSenior, log('Добавление ребёнка в отряд'), squadCtrl.createChild);
router.put('/children', auth, log('Изменение данных ребёнка'), squadCtrl.updateChild);
router.get('/children/detached', auth, requireSenior, squadCtrl.detachedChildren);
router.post('/children/change-child-to-squad', auth, requireSenior, log('Привязка/отвязка ребёнка к отряду'), squadCtrl.changeChildForSquad);
router.get('/children/:childId/tags', auth, squadCtrl.childTags);

// ---- children tags ----
// NB: статичные сегменты /children/tags объявлены ДО /children/:childId,
// иначе Express сопоставит «tags» как :childId.
router.post('/children/tags', auth, log('Создание тега ребёнка'), tagCtrl.create);
router.put('/children/tags', auth, log('Изменение тега ребёнка'), tagCtrl.update);
router.delete('/children/tags', auth, log('Удаление тега ребёнка'), tagCtrl.remove);

router.delete('/children/:childId', auth, log('Удаление ребёнка из отряда'), squadCtrl.deleteChild);

// ---- notifications ----
router.get('/notifications', auth, notifCtrl.list);
router.post('/notifications', auth, requireSenior, log('Создание уведомления'), notifCtrl.create);
router.post('/notifications/read', auth, log('Прочтение уведомления'), notifCtrl.read);
router.post('/notifications/read-all', auth, log('Прочтение всех уведомлений'), notifCtrl.readAll);
router.post('/notifications/read-notif', auth, log('Прочтение уведомления'), notifCtrl.read); // алиас из раздела ТЗ «Уведомления»
router.put('/notifications', auth, requireSenior, log('Изменение уведомления'), notifCtrl.update);
router.delete('/notifications', auth, requireSenior, log('Удаление уведомления'), notifCtrl.remove);

// ---- events / attendance (Журнал) ----
router.get('/events', auth, eventCtrl.list);
router.post('/events', auth, requireSenior, log('Добавление Активности'), eventCtrl.create);
router.put('/events', auth, requireSenior, log('Изменение Активности'), eventCtrl.update);
router.delete('/events/:eventId', auth, requireSenior, log('Удаление Активности'), eventCtrl.remove);
router.get('/events/:eventId/attendance/:squadId', auth, eventCtrl.getAttendance);
router.post('/events/:eventId/attendance', auth, log('Отметка присутствия на Активности'), eventCtrl.updateAttendance);

// Алиас из ТЗ «Журнал»: GET /attendance/?eventId=...
router.get('/attendance', auth, async (req, res, next) => {
  try {
    const squadService = require('../services/squadService');
    const squad = await squadService.mySquad(req.user);
    req.params.eventId = req.query.eventId;
    req.params.squadId = squad.squadId;
    return eventCtrl.getAttendance(req, res, next);
  } catch (err) {
    next(err);
  }
});
router.post('/attendance', auth, log('Отметка присутствия на Активности'), async (req, res, next) => {
  req.params.eventId = req.body.eventId;
  return eventCtrl.updateAttendance(req, res, next);
});

// ---- applications (Заявки вожатых) ----
router.get('/applications', auth, requireSenior, adminCtrl.applications);
router.post('/applications/reject-all', auth, requireSenior, log('Отклонение всех заявок вожатых'), adminCtrl.rejectAllApplications);
router.post('/applications/:id/approve', auth, requireSenior, log('Одобрение заявки вожатого'), adminCtrl.approveApplication);
router.post('/applications/:id/reject', auth, requireSenior, log('Отклонение заявки вожатого'), adminCtrl.rejectApplication);

// ---- logs (senior+) ----
router.get('/logs', auth, requireSenior, adminCtrl.logs);

// ---- stats (director) ----
router.get('/stats/shift', auth, requireDirector, adminCtrl.stats);

// ---- chat (общая комната) ----
router.get('/chat/messages', auth, adminCtrl.chatHistory);
router.post('/chat/messages', auth, log('Отправка сообщения в чат'), adminCtrl.chatSend);

module.exports = router;

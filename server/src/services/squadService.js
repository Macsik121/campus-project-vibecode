'use strict';

const squadRepo = require('../repositories/squadRepo');
const childRepo = require('../repositories/childRepo');
const userRepo = require('../repositories/userRepo');
const eventRepo = require('../repositories/eventRepo');
const notificationService = require('./notificationService');
const { notFound, forbidden, badRequest } = require('../middleware/errors');
const { isSeniorOrUp } = require('../middleware/roles');
const { validateUuid, requireFields } = require('../middleware/validate');

/** Отряд текущего вожатого (404 NO_SQUAD — клиент показывает текст «не привязан», см. README) */
async function mySquad(user) {
  const squad = await squadRepo.squadOfUser(user.id);
  if (!squad) throw notFound('NO_SQUAD', 'Вожатый не привязан ни к одному отряду');
  return { squadId: squad.id };
}

/** Проверка права изменять отряд: senior+ — любой, обычный — только назначенный (ТЗ «Безопасность») */
async function assertCanModifySquad(user, squadId) {
  if (isSeniorOrUp(user)) return;
  const assigned = await squadRepo.isAssigned(user.id, squadId);
  if (!assigned) {
    throw forbidden('NOT_ASSIGNED', 'Вожатый не назначен на отряд и не старший вожатый. Если надо, попросите внести изменения старшего вожатого.');
  }
}

async function createSquads(user, squadsData) {
  if (!Array.isArray(squadsData) || squadsData.length === 0) {
    throw badRequest('VALIDATION', 'Передайте непустой массив squadsData');
  }
  const shift = await userRepo.currentShift();
  const ids = [];
  for (const s of squadsData) {
    requireFields(s, ['title']);
    const created = await squadRepo.create({ title: s.title, description: s.description }, shift ? shift.id : null);
    ids.push(created.id);
  }
  return { squadIds: ids, userId: user.id, date: new Date().toISOString() };
}

async function reassignUser(user, { squadId, userId }) {
  requireFields({ squadId, userId }, ['squadId', 'userId']);
  validateUuid(squadId, 'squadId');
  validateUuid(userId, 'userId');

  const squad = await squadRepo.findById(squadId);
  if (!squad) throw notFound('SQUAD_NOT_FOUND', 'Отряд с переданным ID не найден');
  const target = await userRepo.findById(userId);
  if (!target) throw notFound('USER_NOT_FOUND', 'Пользователь с переданным ID не найден');

  const oldSquadId = await squadRepo.reassignUser(userId, squadId);
  await notificationService.notifyAll({
    title: 'Назначение вожатого',
    description: `${target.full_name} назначен(а) на отряд «${squad.title}»`,
    kind: 'info',
    createdBy: user.id,
  });
  return { squadId, userId, oldSquadId, date: new Date().toISOString() };
}

async function childrenOfSquad(user, squadId) {
  validateUuid(squadId, 'squadId');
  const squad = await squadRepo.findById(squadId);
  if (!squad) throw notFound('SQUAD_NOT_FOUND', 'Отряда с ID squadId не найден');

  // Чтение: назначенный вожатый или senior+
  if (!isSeniorOrUp(user)) {
    const assigned = await squadRepo.isAssigned(user.id, squadId);
    if (!assigned) {
      throw forbidden('NOT_ASSIGNED', 'Нет назначения на данный отряд');
    }
  }

  const children = await childRepo.bySquad(squadId);
  return { squadId: squad.id, squadTitle: squad.title, children };
}

async function createChild(user, data) {
  requireFields(data, ['fullName', 'age', 'parentFullName', 'parentPhone']);
  if (data.id) throw badRequest('VALIDATION', 'Id не должен быть указан при создании');
  if (data.squadId) {
    validateUuid(data.squadId, 'squadId');
    const squad = await squadRepo.findById(data.squadId);
    if (!squad) throw notFound('SQUAD_NOT_FOUND', 'Отряд не найден');
  }
  const child = await childRepo.create(data);
  return childRepo.mapRow(child, []);
}

async function updateChild(user, data) {
  requireFields(data, ['id']);
  validateUuid(data.id, 'id');
  const child = await childRepo.findById(data.id);
  if (!child) throw notFound('CHILD_NOT_FOUND', 'Ребёнок не найден');
  await assertCanModifySquad(user, child.squad_id);

  const updated = await childRepo.update(data.id, data);
  const tags = await childRepo.tagsOf(data.id);
  return childRepo.mapRow(updated, tags);
}

async function deleteChild(user, childId) {
  validateUuid(childId, 'childId');
  const child = await childRepo.findById(childId);
  if (!child) throw notFound('CHILD_NOT_FOUND', 'Ребёнок не найден');
  await assertCanModifySquad(user, child.squad_id);
  await childRepo.softDelete(childId);
}

async function detachedChildren() {
  return childRepo.detached();
}

async function changeChildForSquad(user, { childId, squadId, attach }) {
  requireFields({ childId, attach }, ['childId', 'attach']);
  validateUuid(childId, 'childId');
  const child = await childRepo.findById(childId);
  if (!child) throw notFound('CHILD_NOT_FOUND', 'Ребёнок с таким Id не найден');

  if (attach) {
    validateUuid(squadId, 'squadId');
    const squad = await squadRepo.findById(squadId);
    if (!squad) throw notFound('SQUAD_NOT_FOUND', 'Отряд с таким Id не найден');
    await childRepo.attachToSquad(childId, squadId);
  } else {
    await childRepo.detachFromSquad(childId);
  }
  return { childId, userId: user.id, info: attach ? 'attached' : 'detached' };
}

async function childTags(user, childId) {
  validateUuid(childId, 'childId');
  const child = await childRepo.findById(childId);
  if (!child) throw notFound('CHILD_NOT_FOUND', 'У ребёнка не найдены теги');
  if (!isSeniorOrUp(user) && child.squad_id) {
    await assertCanModifySquad(user, child.squad_id);
  }
  const tags = await childRepo.tagsOf(childId);
  if (tags.length === 0) throw notFound('TAGS_NOT_FOUND', 'У ребёнка не найдены теги');
  return tags;
}

// Переэкспорт для attendance-логики
async function squadIdOfChild(childId) {
  const child = await childRepo.findById(childId);
  return child ? child.squad_id : null;
}

module.exports = {
  mySquad, assertCanModifySquad, createSquads, reassignUser, childrenOfSquad,
  createChild, updateChild, deleteChild, detachedChildren, changeChildForSquad,
  childTags, squadIdOfChild, listSquads: squadRepo.listAll,
  _eventRepo: eventRepo,
};

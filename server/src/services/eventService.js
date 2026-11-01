'use strict';

const eventRepo = require('../repositories/eventRepo');
const attendanceRepo = require('../repositories/attendanceRepo');
const childRepo = require('../repositories/childRepo');
const squadRepo = require('../repositories/squadRepo');
const notificationService = require('./notificationService');
const { notFound, badRequest, forbidden } = require('../middleware/errors');
const { requireFields, validateUuid } = require('../middleware/validate');
const { isSeniorOrUp } = require('../middleware/roles');

function validateEventTimes(timeFrom, timeTo) {
  const from = new Date(timeFrom);
  const to = new Date(timeTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw badRequest('VALIDATION', 'timeFrom и timeTo должны быть датами ISO 8601');
  }
  if (from >= to) throw badRequest('VALIDATION', 'time_from должно быть раньше time_to');
  if (to - from < 10 * 60 * 1000) {
    throw badRequest('VALIDATION', 'Минимальная длительность мероприятия — 10 минут');
  }
}

async function createEvent(user, { title, description = '', eventType = 'general', timeFrom, timeTo, squadId = null }) {
  requireFields({ title, timeFrom, timeTo }, ['title', 'timeFrom', 'timeTo']);
  validateEventTimes(timeFrom, timeTo);
  if (squadId) {
    validateUuid(squadId, 'squadId');
    const squad = await squadRepo.findById(squadId);
    if (!squad) throw notFound('SQUAD_NOT_FOUND', 'Отряд не найден');
  }

  const event = await eventRepo.create({ title, description, eventType, timeFrom, timeTo, squadId, createdBy: user.id });
  // ERD: строки посещаемости создаются автоматически при создании события (is_present = false)
  await eventRepo.createAttendanceRows(event.id, squadId);

  await notificationService.notifyAll({
    title: 'Новое мероприятие',
    description: `${title}: ${new Date(timeFrom).toLocaleString('ru-RU')}`,
    kind: 'info',
    createdBy: user.id,
  });
  return eventRepo.mapRow(event);
}

async function listEvents({ date = null, limit = 10 }) {
  if (date && Number.isNaN(new Date(date).getTime())) {
    throw badRequest('VALIDATION', 'Параметр date должен быть датой ISO 8601');
  }
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  return eventRepo.list({ date, limit: parsedLimit });
}

async function updateEvent(user, { id, title, description, eventType, timeFrom, timeTo }) {
  requireFields({ id }, ['id']);
  validateUuid(id, 'id');
  const event = await eventRepo.findById(id);
  if (!event) throw notFound('EVENT_NOT_FOUND', 'Мероприятие не найдено');

  const newFrom = timeFrom || event.time_from;
  const newTo = timeTo || event.time_to;
  validateEventTimes(newFrom, newTo);

  const updated = await eventRepo.update(id, { title, description, eventType, timeFrom, timeTo });
  return eventRepo.mapRow(updated);
}

async function deleteEvent(eventId) {
  validateUuid(eventId, 'eventId');
  const deleted = await eventRepo.remove(eventId);
  if (!deleted) throw notFound('EVENT_NOT_FOUND', 'Мероприятие не найдено');
}

async function getAttendance(eventId, squadId) {
  validateUuid(eventId, 'eventId');
  validateUuid(squadId, 'squadId');
  const event = await eventRepo.findById(eventId);
  if (!event) throw notFound('EVENT_NOT_FOUND', 'Мероприятие не найдено');
  const childIds = await attendanceRepo.presentChildIds(eventId, squadId);
  return { childIds };
}

async function updateAttendance(user, eventId, { childId, present }) {
  validateUuid(eventId, 'eventId');
  requireFields({ childId, present }, ['childId', 'present']);
  validateUuid(childId, 'childId');

  const event = await eventRepo.findById(eventId);
  if (!event) throw notFound('EVENT_NOT_FOUND', 'Мероприятие не найдено');
  const child = await childRepo.findById(childId);
  if (!child) throw notFound('CHILD_NOT_FOUND', 'Ребёнок не найден');

  // Права: назначенный на отряд ребёнка вожатый или senior+ (ТЗ)
  if (!isSeniorOrUp(user)) {
    if (!child.squad_id) throw forbidden('NOT_ASSIGNED', 'Отмечать детей может только назначенный на отряд вожатый или старший.');
    const assigned = await squadRepo.isAssigned(user.id, child.squad_id);
    if (!assigned) throw forbidden('NOT_ASSIGNED', 'Отмечать детей может только назначенный на отряд вожатый или старший.');
  }

  let row = await attendanceRepo.getRow(eventId, childId);
  if (!row) {
    // Ребёнка не было в списке на момент создания события — добавляем строку
    row = await attendanceRepo.insertRow(eventId, childId, present, user.id);
    if (!row) throw badRequest('ATTENDANCE_CONFLICT', 'Ребёнок на данном мероприятии уже отмечен');
    return { message: present ? 'Отмечен присутствующим' : 'Отмечен отсутствующим' };
  }

  if (row.is_present === Boolean(present)) {
    throw badRequest('ATTENDANCE_CONFLICT', present
      ? 'Ребёнок на данном мероприятии уже отмечен'
      : 'Ребёнок не был отмечен на данном мероприятии');
  }

  await attendanceRepo.setPresent(eventId, childId, Boolean(present), user.id);
  return { message: present ? 'Отмечен присутствующим' : 'Отметка снята' };
}

module.exports = { createEvent, listEvents, updateEvent, deleteEvent, getAttendance, updateAttendance };

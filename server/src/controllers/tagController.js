'use strict';

const tagRepo = require('../repositories/tagRepo');
const childRepo = require('../repositories/childRepo');
const squadService = require('../services/squadService');
const { badRequest, notFound } = require('../middleware/errors');
const { requireFields, validateUuid } = require('../middleware/validate');

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

function validateTagType(type) {
  if (!tagRepo.TAG_TYPES.includes(type)) {
    throw badRequest('VALIDATION', `Некорректный tagType (${tagRepo.TAG_TYPES.join('|')})`);
  }
}

/** Права на теги: назначенный на отряд ребёнка вожатый или senior+ (ТЗ) */
async function assertTagRights(user, childId) {
  validateUuid(childId, 'childId');
  const child = await childRepo.findById(childId);
  if (!child) throw notFound('CHILD_NOT_FOUND', 'Ребёнок с указанным childId не найден');
  if (child.squad_id) await squadService.assertCanModifySquad(user, child.squad_id);
  return child;
}

const create = wrap(async (req, res) => {
  requireFields(req.body, ['childId', 'tagType', 'tagInfo']);
  validateTagType(req.body.tagType);
  await assertTagRights(req.user, req.body.childId);
  const tag = await tagRepo.create(req.body.childId, req.body.tagType, req.body.tagInfo);
  res.status(201).json({ id: tag.id, childId: tag.child_id, tagType: tag.type, tagInfo: tag.info });
});

const update = wrap(async (req, res) => {
  requireFields(req.body, ['childId', 'tag']);
  const { tag } = req.body;
  requireFields(tag, ['id', 'type', 'info']);
  validateTagType(tag.type);
  await assertTagRights(req.user, req.body.childId);
  const updated = await tagRepo.update(tag.id, tag.type, tag.info);
  if (!updated) throw notFound('TAG_NOT_FOUND', 'Тег с указанным id не найден');
  res.json({ id: updated.id, childId: updated.child_id, tagType: updated.type, tagInfo: updated.info });
});

const remove = wrap(async (req, res) => {
  requireFields(req.body, ['childId', 'tag']);
  requireFields(req.body.tag, ['id']);
  await assertTagRights(req.user, req.body.childId);
  const deleted = await tagRepo.remove(req.body.tag.id);
  if (!deleted) throw notFound('TAG_NOT_FOUND', 'Тег с указанным id не найден');
  res.status(204).send();
});

module.exports = { create, update, remove };

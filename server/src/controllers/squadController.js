'use strict';

const squadService = require('../services/squadService');

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

const mySquad = wrap(async (req, res) => {
  res.json(await squadService.mySquad(req.user));
});

const listSquads = wrap(async (_req, res) => {
  res.json(await squadService.listSquads());
});

const createSquads = wrap(async (req, res) => {
  res.json(await squadService.createSquads(req.user, req.body.squadsData));
});

const reassignUser = wrap(async (req, res) => {
  res.json(await squadService.reassignUser(req.user, req.body));
});

const childrenOfSquad = wrap(async (req, res) => {
  res.json(await squadService.childrenOfSquad(req.user, req.params.squadId));
});

const createChild = wrap(async (req, res) => {
  res.json(await squadService.createChild(req.user, req.body));
});

const updateChild = wrap(async (req, res) => {
  res.json(await squadService.updateChild(req.user, req.body));
});

const deleteChild = wrap(async (req, res) => {
  await squadService.deleteChild(req.user, req.params.childId);
  res.status(204).send();
});

const detachedChildren = wrap(async (_req, res) => {
  res.json(await squadService.detachedChildren());
});

const changeChildForSquad = wrap(async (req, res) => {
  res.json(await squadService.changeChildForSquad(req.user, req.body));
});

const childTags = wrap(async (req, res) => {
  res.json(await squadService.childTags(req.user, req.params.childId));
});

module.exports = {
  mySquad, listSquads, createSquads, reassignUser, childrenOfSquad,
  createChild, updateChild, deleteChild, detachedChildren, changeChildForSquad, childTags,
};

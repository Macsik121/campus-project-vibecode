'use strict';

const eventService = require('../services/eventService');

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

const list = wrap(async (req, res) => {
  res.json(await eventService.listEvents({ date: req.query.date, limit: req.query.limit }));
});

const create = wrap(async (req, res) => {
  res.status(201).json(await eventService.createEvent(req.user, req.body));
});

const update = wrap(async (req, res) => {
  res.json(await eventService.updateEvent(req.user, req.body));
});

const remove = wrap(async (req, res) => {
  await eventService.deleteEvent(req.params.eventId);
  res.status(204).send();
});

const getAttendance = wrap(async (req, res) => {
  res.json(await eventService.getAttendance(req.params.eventId, req.params.squadId));
});

const updateAttendance = wrap(async (req, res) => {
  res.json(await eventService.updateAttendance(req.user, req.params.eventId, req.body));
});

module.exports = { list, create, update, remove, getAttendance, updateAttendance };

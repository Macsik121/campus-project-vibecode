'use strict';

const userService = require('../services/userService');

function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

const profile = wrap(async (req, res) => {
  res.json(await userService.profile(req.user));
});

const updateProfile = wrap(async (req, res) => {
  res.json(await userService.updateProfile(req.user, req.body));
});

const changePassword = wrap(async (req, res) => {
  res.json(await userService.changePassword(req.user, req.body));
});

module.exports = { profile, updateProfile, changePassword };

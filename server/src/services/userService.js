'use strict';

const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/userRepo');
const squadRepo = require('../repositories/squadRepo');
const { badRequest, unauthorized, notFound } = require('../middleware/errors');
const { validateEmail, validatePassword } = require('../middleware/validate');

const ROLE_TITLES = {
  counselour: 'Вожатый',
  senior_counselour: 'Старший вожатый',
  director: 'Директор',
};

async function profile(user) {
  const dbUser = await userRepo.findById(user.id);
  const squad = await squadRepo.squadOfUser(user.id);
  return {
    id: dbUser.id,
    fullName: dbUser.full_name,
    email: dbUser.email,
    role: dbUser.role,
    roleTitle: ROLE_TITLES[dbUser.role] || dbUser.role,
    avatar: dbUser.avatar_url,
    phoneNumber: dbUser.phone_number,
    squad: squad ? { id: squad.id, title: squad.title } : null,
  };
}

async function updateProfile(user, { fullName, email, phoneNumber, avatar }) {
  if (email) validateEmail(email);
  if (email) {
    const existing = await userRepo.findByEmail(email);
    if (existing && existing.id !== user.id) {
      throw badRequest('EMAIL_TAKEN', 'Пользователь с данной почтой уже существует');
    }
  }
  const updated = await userRepo.updateProfile(user.id, { fullName, email, phoneNumber, avatarUrl: avatar });
  if (!updated) throw notFound('USER_NOT_FOUND', 'Пользователь не найден');
  return profile(user);
}

async function changePassword(user, { oldPassword, newPassword }) {
  if (!oldPassword || !newPassword) throw badRequest('VALIDATION', 'Укажите старый и новый пароль');
  validatePassword(newPassword);
  const dbUser = await userRepo.findById(user.id);
  const ok = await bcrypt.compare(oldPassword, dbUser.password_hash);
  if (!ok) throw unauthorized('Неверный текущий пароль');
  await userRepo.updatePassword(user.id, await bcrypt.hash(newPassword, 10));
  return { message: 'Пароль изменён' };
}

module.exports = { profile, updateProfile, changePassword };

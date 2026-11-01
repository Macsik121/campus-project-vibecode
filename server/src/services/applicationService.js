'use strict';

const applicationRepo = require('../repositories/applicationRepo');
const userRepo = require('../repositories/userRepo');
const notificationService = require('./notificationService');
const { notFound, badRequest } = require('../middleware/errors');
const { validateUuid, requireFields } = require('../middleware/validate');

async function list(status) {
  if (status && !['pending', 'approved', 'rejected'].includes(status)) {
    throw badRequest('VALIDATION', 'status должен быть pending|approved|rejected');
  }
  const rows = await applicationRepo.list(status);
  return rows.map((a) => ({
    id: a.id,
    status: a.status,
    rejectReason: a.reject_reason,
    createdAt: a.created_at,
    reviewedAt: a.reviewed_at,
    reviewerName: a.reviewer_name,
    user: {
      id: a.user_id,
      fullName: a.full_name,
      email: a.email,
      phoneNumber: a.phone_number,
      role: a.user_role,
    },
  }));
}

async function approve(reviewer, applicationId) {
  validateUuid(applicationId, 'id');
  const application = await applicationRepo.findById(applicationId);
  if (!application) throw notFound('APPLICATION_NOT_FOUND', 'Заявка не найдена');
  if (application.status !== 'pending') throw badRequest('ALREADY_REVIEWED', 'Заявка уже рассмотрена');

  const reviewed = await applicationRepo.review(applicationId, {
    status: 'approved',
    reviewedBy: reviewer.id,
  });
  await userRepo.setStatus(application.user_id, 'active');
  // Числим вожатого на текущей смене (валидация токена: «вожатый числится на смене»)
  const shift = await userRepo.currentShift();
  if (shift) await userRepo.addToShift(application.user_id, shift.id);

  await notificationService.notifyAll({
    title: 'Заявка одобрена',
    description: 'Заявка вожатого одобрена, доступ к системе открыт.',
    kind: 'info',
    createdBy: reviewer.id,
  });
  return reviewed;
}

async function reject(reviewer, applicationId, reason) {
  validateUuid(applicationId, 'id');
  requireFields({ reason }, ['reason']);
  const application = await applicationRepo.findById(applicationId);
  if (!application) throw notFound('APPLICATION_NOT_FOUND', 'Заявка не найдена');
  if (application.status !== 'pending') throw badRequest('ALREADY_REVIEWED', 'Заявка уже рассмотрена');

  const reviewed = await applicationRepo.review(applicationId, {
    status: 'rejected',
    rejectReason: reason,
    reviewedBy: reviewer.id,
  });
  await userRepo.setStatus(application.user_id, 'rejected');
  return reviewed;
}

/** Отклонить все ожидающие заявки одной причиной (ТЗ: «Необходимое количество вожатых на смену набралось») */
async function rejectAll(reviewer, reason) {
  requireFields({ reason }, ['reason']);
  const userIds = await applicationRepo.rejectAllPending({ reason, reviewedBy: reviewer.id });
  for (const userId of userIds) {
    await userRepo.setStatus(userId, 'rejected');
  }
  return { rejected: userIds.length };
}

module.exports = { list, approve, reject, rejectAll };

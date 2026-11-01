'use strict';

const logRepo = require('../repositories/logRepo');

/**
 * Logger middleware по ТЗ:
 *  - пишется в action_logs на все Create/Update/Delete операции и на login/register/logout;
 *  - на Read-операции не ставится;
 *  - userId известен после authMiddleware, поэтому запись делается по завершении ответа.
 * @param {string} eventText описание действия для лога
 */
function actionLogger(eventText) {
  return (req, res, next) => {
    res.on('finish', () => {
      // Логируем только успешные изменяющие операции
      if (res.statusCode >= 400) return;
      const userId = req.user ? req.user.id : (res.locals.loggedUserId || null);
      logRepo
        .add({
          causedBy: userId,
          event: eventText,
          method: req.method,
          path: req.baseUrl + req.path,
          meta: { body: sanitizeBody(req.body), params: req.params },
        })
        .catch((err) => console.error('[logger] Ошибка записи в action_logs:', err.message));
    });
    next();
  };
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  delete clone.password;
  return clone;
}

module.exports = actionLogger;

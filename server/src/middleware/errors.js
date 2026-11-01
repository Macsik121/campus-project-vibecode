'use strict';

/** Единый формат ошибки API: { error: { code, message } } */
class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (code, message) => new ApiError(400, code, message);
const unauthorized = (message = 'Требуется авторизация') => new ApiError(401, 'UNAUTHORIZED', message);
const forbidden = (code, message) => new ApiError(403, code, message);
const notFound = (code, message) => new ApiError(404, code, message);

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Некорректный JSON в теле запроса' } });
  }
  console.error('[error]', err);
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Внутренняя ошибка сервера' } });
}

module.exports = { ApiError, badRequest, unauthorized, forbidden, notFound, errorHandler };

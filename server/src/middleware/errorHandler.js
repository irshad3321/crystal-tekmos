import messages from '../constants/messages.js';

function notFound(req, res) {
  res.status(404).json({ message: messages.error.NOT_FOUND });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? messages.error.INTERNAL_SERVER_ERROR
    : error.message || messages.error.INTERNAL_SERVER_ERROR;

  res.status(statusCode).json({ success: false, message });
}

export { notFound, errorHandler };

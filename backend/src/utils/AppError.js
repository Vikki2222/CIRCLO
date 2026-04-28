/**
 * Operational errors (4xx, known 5xx) that we handle gracefully.
 * Programmer errors (bugs) should NOT use this — let them crash.
 */
class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = statusCode >= 500 ? 'error' : 'fail';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = AppError;
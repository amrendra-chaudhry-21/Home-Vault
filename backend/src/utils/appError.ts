export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: any) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required', details?: any) {
    return new AppError(message, 401, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'You do not have permission to access this resource', details?: any) {
    return new AppError(message, 403, 'FORBIDDEN', details);
  }

  static notFound(message = 'Resource not found', details?: any) {
    return new AppError(message, 404, 'NOT_FOUND', details);
  }

  static conflict(message: string, details?: any) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static unprocessable(message: string, details?: any) {
    return new AppError(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

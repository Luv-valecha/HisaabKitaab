export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export const badRequest = (m, d) => new AppError(400, "BAD_REQUEST", m, d);
export const unauthorized = (m = "Please log in to continue") => new AppError(401, "UNAUTHORIZED", m);
export const forbidden = (m = "You don't have access to this") => new AppError(403, "FORBIDDEN", m);
export const notFound = (m = "Not found") => new AppError(404, "NOT_FOUND", m);
export const conflict = (m) => new AppError(409, "CONFLICT", m);

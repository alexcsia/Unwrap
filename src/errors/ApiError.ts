import type { ErrorCode } from "./errorMessages";

export class ApiError extends Error {
  statusCode: number;
  code: ErrorCode; // A short internal code
  constructor(statusCode: number, code: ErrorCode, message?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ApiError extends Error {
  statusCode: number;
  code: string; // A short internal code
  constructor(statusCode: number, code: string, message?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

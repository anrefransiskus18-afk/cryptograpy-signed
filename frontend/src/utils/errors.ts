/**
 * Klasifikasi Error Terstandarisasi untuk Layer Repository, Service, dan UI.
 */

export const ErrorType = Object.freeze({
  NETWORK: "NETWORK_ERROR",
  HTTP: "HTTP_ERROR",
  VALIDATION: "VALIDATION_ERROR",
  BUSINESS: "BUSINESS_ERROR",
  CRYPTO: "CRYPTO_ERROR",
  UNEXPECTED: "UNEXPECTED_ERROR"
} as const);

export type ErrorTypeValue = (typeof ErrorType)[keyof typeof ErrorType];

export interface AppErrorOptions {
  type?: ErrorTypeValue;
  status?: number | null;
  errorCode?: string | null;
  detail?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly type: ErrorTypeValue;
  public readonly status: number | null;
  public readonly errorCode: string | null;
  public readonly detail: unknown;
  public readonly cause: unknown;

  constructor(
    message: string,
    {
      type = ErrorType.UNEXPECTED,
      status = null,
      errorCode = null,
      detail = null,
      cause = null
    }: AppErrorOptions = {}
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.status = status;
    this.errorCode = errorCode;
    this.detail = detail;
    this.cause = cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, type: ErrorType.VALIDATION });
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, type: ErrorType.HTTP, status: opts.status ?? 401 });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, type: ErrorType.HTTP, status: opts.status ?? 403 });
    this.name = "AuthorizationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, type: ErrorType.NETWORK });
    this.name = "NetworkError";
  }
}

export class TimeoutError extends NetworkError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, errorCode: opts.errorCode ?? "ECONNABORTED" });
    this.name = "TimeoutError";
  }
}

export class ApiError extends AppError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, type: ErrorType.HTTP });
    this.name = "ApiError";
  }
}

export class CryptographyError extends AppError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, type: ErrorType.CRYPTO });
    this.name = "CryptographyError";
  }
}

export class UnexpectedError extends AppError {
  constructor(message: string, opts: AppErrorOptions = {}) {
    super(message, { ...opts, type: ErrorType.UNEXPECTED });
    this.name = "UnexpectedError";
  }
}

interface HttpLikeError {
  code?: string;
  name?: string;
  message?: string;
  response?: {
    status?: number;
    data?: {
      detail?: string | { error_code?: string; message?: string };
      message?: string;
    };
  };
}

export function extractErrorMessage(
  err: unknown,
  fallbackMessage = "Terjadi kesalahan pada permintaan ke server."
): string {
  if (err instanceof AppError && err.message) {
    return err.message;
  }
  const e = err as HttpLikeError | null | undefined;
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail === "object" && typeof detail.message === "string") {
    return detail.message;
  }
  if (typeof e?.response?.data?.message === "string") {
    return e.response.data.message;
  }
  if (typeof e?.message === "string" && e.message.trim()) {
    return e.message;
  }
  return fallbackMessage;
}

export function normalizeApiError(
  err: unknown,
  fallbackMessage = "Terjadi kesalahan komunikasi dengan server."
): AppError {
  if (err instanceof AppError) {
    return err;
  }
  const e = (err || {}) as HttpLikeError;

  if (e.code === "ERR_CANCELED" || e.name === "CanceledError") {
    return new NetworkError("Permintaan dibatalkan.", {
      errorCode: "ERR_CANCELED",
      cause: err
    });
  }

  if (!e.response) {
    if (e.code === "ECONNABORTED") {
      return new TimeoutError("Waktu permintaan ke server habis. Silakan coba lagi.", {
        cause: err
      });
    }
    return new NetworkError("Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.", {
      cause: err
    });
  }

  const { status, data } = e.response;
  const detail = data?.detail;
  const errorCode = typeof detail === "object" && detail !== null ? detail.error_code || null : null;
  const message = extractErrorMessage(err, fallbackMessage);

  if (status === 401) {
    return new AuthenticationError(message, { status, errorCode, detail, cause: err });
  }
  if (status === 403) {
    return new AuthorizationError(message, { status, errorCode, detail, cause: err });
  }
  if (status === 422 || errorCode === "TAMPER_DETECTED") {
    return new CryptographyError(message, { status, errorCode, detail, cause: err });
  }
  return new ApiError(message, { status, errorCode, detail, cause: err });
}

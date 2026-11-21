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
});

export class AppError extends Error {
  constructor(
    message,
    {
      type = ErrorType.UNEXPECTED,
      status = null,
      errorCode = null,
      detail = null,
      cause = null
    } = {}
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
  constructor(message, opts = {}) {
    super(message, { ...opts, type: ErrorType.VALIDATION });
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, type: ErrorType.HTTP, status: opts.status ?? 401 });
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, type: ErrorType.HTTP, status: opts.status ?? 403 });
    this.name = "AuthorizationError";
  }
}

export class NetworkError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, type: ErrorType.NETWORK });
    this.name = "NetworkError";
  }
}

export class TimeoutError extends NetworkError {
  constructor(message, opts = {}) {
    super(message, { ...opts, errorCode: opts.errorCode ?? "ECONNABORTED" });
    this.name = "TimeoutError";
  }
}

export class ApiError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, type: ErrorType.HTTP });
    this.name = "ApiError";
  }
}

export class CryptographyError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, type: ErrorType.CRYPTO });
    this.name = "CryptographyError";
  }
}

export class UnexpectedError extends AppError {
  constructor(message, opts = {}) {
    super(message, { ...opts, type: ErrorType.UNEXPECTED });
    this.name = "UnexpectedError";
  }
}

export function extractErrorMessage(err, fallbackMessage = "Terjadi kesalahan pada permintaan ke server.") {
  if (err instanceof AppError && err.message) {
    return err.message;
  }
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail.message === "string") {
    return detail.message;
  }
  if (typeof err?.response?.data?.message === "string") {
    return err.response.data.message;
  }
  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message;
  }
  return fallbackMessage;
}

export function normalizeApiError(err, fallbackMessage = "Terjadi kesalahan komunikasi dengan server.") {
  if (err instanceof AppError) {
    return err;
  }

  if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
    return new NetworkError("Permintaan dibatalkan.", {
      errorCode: "ERR_CANCELED",
      cause: err
    });
  }

  if (!err?.response) {
    if (err?.code === "ECONNABORTED") {
      return new TimeoutError("Waktu permintaan ke server habis. Silakan coba lagi.", {
        cause: err
      });
    }
    return new NetworkError("Tidak dapat terhubung ke server. Periksa koneksi jaringan Anda.", {
      cause: err
    });
  }

  const { status, data } = err.response;
  const detail = data?.detail;
  const errorCode = typeof detail === "object" ? detail?.error_code || null : null;
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

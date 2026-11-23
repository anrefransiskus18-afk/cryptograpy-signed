/**
 * Centralized Structured Logger dengan sanitasi otomatis data sensitif.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "current_password",
  "new_password",
  "passphrase",
  "key_passphrase",
  "private_key",
  "private_key_pkcs8",
  "private_key_pkcs8_pem",
  "encrypted_private_key_pem",
  "token",
  "access_token",
  "refresh_token",
  "jwt_token",
  "csrf_token",
  "authorization",
  "secret",
  "session_key",
  "plaintext",
  "ciphertext"
]);

const SENSITIVE_KEY_PATTERN = /token|password|passphrase|secret|private_key|session_key|authorization|api_key/i;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/;

export type LogLevel = "info" | "warn" | "error";

export function sanitizeLogData(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.includes("-----BEGIN ") && value.includes("PRIVATE KEY-----")) {
      return "[REDACTED_PRIVATE_KEY]";
    }
    if (value.startsWith("Bearer ")) {
      return "Bearer [REDACTED]";
    }
    if (JWT_PATTERN.test(value)) {
      return "[REDACTED_JWT]";
    }
    return value;
  }
  if (typeof value !== "object") return value;
  if (value instanceof Error) {
    const appErr = value as Error & { type?: string; status?: number; errorCode?: string };
    return {
      name: value.name,
      message: sanitizeLogData(value.message, depth + 1),
      type: appErr.type || undefined,
      status: appErr.status || undefined,
      errorCode: appErr.errorCode || undefined
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || SENSITIVE_KEY_PATTERN.test(lower)) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = sanitizeLogData(v, depth + 1);
    }
  }
  return out;
}

function emit(level: LogLevel, event: string, context: Record<string, unknown> = {}): void {
  const sanitized = sanitizeLogData(context) as Record<string, unknown>;
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitized
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else if (import.meta.env?.DEV) {
    console.info(JSON.stringify(entry));
  }
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>): void => emit("info", event, context),
  warn: (event: string, context?: Record<string, unknown>): void => emit("warn", event, context),
  error: (event: string, context?: Record<string, unknown>): void => emit("error", event, context)
};

export default logger;

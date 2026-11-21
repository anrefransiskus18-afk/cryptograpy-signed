/**
 * Centralized Structured Logger dengan sanitasi otomatis data sensitif.
 * Mencegah kebocoran password, passphrase, private key, token, atau plaintext ke log/telemetry.
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
  "authorization",
  "secret",
  "session_key",
  "plaintext",
  "ciphertext"
]);

export function sanitizeLogData(value, depth = 0) {
  if (depth > 4) return "[TRUNCATED]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.includes("-----BEGIN ") && value.includes("PRIVATE KEY-----")) {
      return "[REDACTED_PRIVATE_KEY]";
    }
    if (value.startsWith("Bearer ")) {
      return "Bearer [REDACTED]";
    }
    return value;
  }
  if (typeof value !== "object") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogData(value.message, depth + 1),
      type: value.type || undefined,
      status: value.status || undefined,
      errorCode: value.errorCode || undefined
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item, depth + 1));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = sanitizeLogData(v, depth + 1);
    }
  }
  return out;
}

function emit(level, event, context = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitizeLogData(context)
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
  info: (event, context) => emit("info", event, context),
  warn: (event, context) => emit("warn", event, context),
  error: (event, context) => emit("error", event, context)
};

export default logger;

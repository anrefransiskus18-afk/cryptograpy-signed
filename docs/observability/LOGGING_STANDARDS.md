# Logging Standards

## 1. Frontend Structured Log Schema (`frontend/src/utils/logger.ts`)
- **Format**: Single-line JSON with `ts` (ISO-8601 UTC), `level` (`info` | `warn` | `error`), `event`, and sanitized context fields (`method`, `url`, `status`, `code`, `durationMs`, `correlationId`).
- **Environment Gating**: `info` logs emit only in `import.meta.env.DEV`; `warn` and `error` emit in all environments.

## 2. Mandatory Sensitive-Data Redaction
`sanitizeLogData()` recursively traverses objects/arrays (depth limit `4`) and redacts:
- Keys matching `SENSITIVE_KEYS` or `/token|password|passphrase|secret|private_key|session_key|authorization|api_key/i` → `"[REDACTED]"`
- PEM private keys (`-----BEGIN ... PRIVATE KEY-----`) → `"[REDACTED_PRIVATE_KEY]"`
- Bearer headers (`Bearer ...`) → `"Bearer [REDACTED]"`
- JWT strings (`eyJ...`) → `"[REDACTED_JWT]"`
- `plaintext` and `ciphertext` keys → `"[REDACTED]"`

## 3. Backend Request Logging (`backend/app/__init__.py`)
- Logs JSON `http_request` events for `/api/*` (excluding `/api/v1/health` and `/api/v1/metrics` scrape noise) containing `method`, `path`, `status`, `duration_ms`, `correlation_id`, and `ip`.
- Unhandled `500` exceptions log stack traces strictly server-side (`app.logger.error`), returning a generic JSON error to clients.

# Observability & Monitoring Audit — PT XYZ Hybrid Cryptography Framework

**Audit Date:** 2026-11-21

---

## 1. Frontend Observability
- **Structured Logger (`frontend/src/utils/logger.js`):** Emits JSON-formatted logs (`ts`, `level`, `event`, sanitized context). Automatically redacts sensitive keys (`password`, `passphrase`, `private_key*`, `token`, `authorization`, `secret`, `session_key`, `plaintext`, `ciphertext`), PEM private key blocks, and `Bearer ` tokens.
- **Global Error Hooks (`frontend/src/main.js`):** Captures `app.config.errorHandler` (`vue_unhandled_error`) and `window.addEventListener("unhandledrejection")` (`window_unhandled_rejection`) through `logger.error`.
- **API Telemetry (`frontend/src/api/interceptors.js`):** Tracks `durationMs` and `correlationId` (`X-Correlation-ID`) for every HTTP request/failure.
- **Enforcement:** `scripts/check-architecture.mjs` forbids direct `console.log/info/warn/error` outside `utils/logger.js`.

---

## 2. Backend Observability & Audit Trail
- **Correlation ID Propagation (`backend/app/__init__.py`):** `attach_correlation_id` validates incoming `X-Correlation-ID` (or generates a UUIDv4) and echoes it on every HTTP response header.
- **Tamper-Proof Security Audit Trail (`backend/app/services/AuditService.py`):** Records security events in `audit_logs` with SHA-256 hash chaining + ECDSA P-256 signatures, and sanitizes `FORBIDDEN_LOG_KEYS` before persistence. Authentication attempts are persisted in `authentication_logs`.
- **Limitations:** No OpenTelemetry SDK, Prometheus `/metrics` endpoint, or Grafana dashboard provisioning files exist in this repository; observability is currently structured JSON console logging + DB audit logs.

# API & Integration Audit — PT XYZ Hybrid Cryptography Framework

**Audit Date:** 2026-11-21

---

## 1. HTTP Client, Interceptors & Repository Contracts
- **Centralized Client (`frontend/src/api/httpClient.js`):** Axios instance with `API_BASE_URL` (`VITE_API_BASE_URL` or `http://localhost:8000/api/v1`), `DEFAULT_TIMEOUT_MS = 30000`, `LONG_OPERATION_TIMEOUT_MS = 300000`.
- **Interceptors (`frontend/src/api/interceptors.js`):**
  - Request: Attaches `Authorization: Bearer <jwt>`, generates/propagates `X-Correlation-ID`, records `performance.now()` start time, runs `Lazy.transform` on params/body.
  - Response: Logs `api_request_ok` / `api_request_failed` with `durationMs` and `correlationId`, parses `Blob` JSON error bodies (critical for 422 `TAMPER_DETECTED` during `/decrypt`), and clears auth/session storage on HTTP 401.
- **Resilience (`frontend/src/repositories/BaseRepository.js`):**
  - GET request deduplication (`_inFlightGets` map) for concurrent identical requests without `AbortSignal`.
  - Safe retry (`retries = 1`, linear backoff) restricted strictly to idempotent `GET` / `getBlob` on network errors or `502/503/504`; `POST`/`PUT`/`PATCH`/`DELETE` never retry automatically.
  - Explicit `AbortSignal` cancellation (`ERR_CANCELED`) bypasses retry.
  - Standardized error normalization via `normalizeApiError()` -> `AppError`.

---

## 2. Findings & Remediations

### FINDING-API-01 (HIGH) — Asymmetric `X-Correlation-ID` Propagation
- **Affected Files:** `backend/app/__init__.py`
- **Technical Issue:** Frontend sent `X-Correlation-ID` and `interceptors.js` read `response.headers["x-correlation-id"]`, and CORS exposed `X-Correlation-ID`, but the Flask backend never extracted, generated, or echoed `X-Correlation-ID` on responses.
- **Remediation Performed:** Added `@app.before_request` (`attach_correlation_id`) validating incoming `X-Correlation-ID` against `^[A-Za-z0-9._-]{1,64}$` (or generating UUIDv4) and echoing `X-Correlation-ID` in `after_request`.
- **Validation Evidence:** Verified via `backend/tests/test_security_hardening.py::test_correlation_id_echo_and_security_headers` (including CRLF/XSS header rejection).

### FINDING-API-02 (LOW) — `container_format_version` Desync in Runtime Settings
- **Affected File:** `backend/app/api/audit.py`
- **Technical Issue:** Updating `default_key_wrap_mode` to `AES_GCM_KW` did not update `_RUNTIME_SETTINGS["container_format_version"]`.
- **Remediation Performed:** Synchronized `container_format_version` (`HC02 (145-Byte Fixed Prefix)` vs `HC01 (129-Byte Fixed Prefix)`) on `PUT /api/v1/settings`.

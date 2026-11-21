# API & Data Management Architecture

- **Centralized Client (`src/api/httpClient.js`):** Axios instance (`DEFAULT_TIMEOUT_MS = 30000`, `LONG_OPERATION_TIMEOUT_MS = 300000`, `withCredentials: true`).
- **Interceptors (`src/api/interceptors.js`):**
  - Request: Injects `Authorization: Bearer <token>`, generates/propagates `X-Correlation-ID`, records latency start time, applies `Lazy.transform`.
  - Response: Logs structured telemetry (`api_request_ok` / `api_request_failed`), parses `Blob` JSON error payloads (critical for `422 TAMPER_DETECTED`), and resets session on HTTP `401`.
- **Resilience (`src/repositories/BaseRepository.js`):**
  - In-flight `GET` deduplication (`_inFlightGets`).
  - Idempotent `GET` / `getBlob` retry (`retries = 1`) on network errors or `502/503/504`; non-idempotent mutations (`POST`, `PUT`, `PATCH`, `DELETE`) never retry.
  - `AbortSignal` cancellation (`ERR_CANCELED`) skips retry.
- **Typed Error Hierarchy (`src/utils/errors.js`):** `AppError` subclasses (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NetworkError`, `TimeoutError`, `ApiError`, `CryptographyError`, `UnexpectedError`).

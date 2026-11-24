# API Client Architecture

## 1. Centralized Axios Instance (`frontend/src/api/httpClient.ts`)
- `API_BASE_URL`: `import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000/api/v1"`
- `DEFAULT_TIMEOUT_MS`: `30000` (`30s`)
- `LONG_OPERATION_TIMEOUT_MS`: `300000` (`5m`, used by `getBlob` & `postMultipart` for up to 125 MiB payloads)
- `withCredentials: true`

## 2. Interceptors (`frontend/src/api/interceptors.ts`)
- **Request**: Injects `Authorization: Bearer <token>`, injects `X-CSRF-Token` from `csrf_token` cookie on `post|put|patch|delete`, assigns UUID v4 `X-Correlation-ID`, records `performance.now()`, and serializes `queryStruct`/`requestStruct` via `Lazy.transform`.
- **Response**: Logs `api_request_ok` / `api_request_failed`, parses `Blob` JSON errors (e.g. `422 TAMPER_DETECTED`), hydrates `responseStruct`, and resets session on `401` outside `/login`.

## 3. Idempotent Retry & Deduplication (`BaseRepository.ts`)
- `GET` and `getBlob` deduplicate simultaneous identical requests (`_inFlightGets`) when `signal` is absent and retry once (`retries = 1`) only on transient network or `502/503/504` responses.
- `POST`, `PUT`, `PATCH`, and `DELETE` **never retry** automatically to preserve non-idempotent safety.
- Cancelled requests (`ERR_CANCELED` / `CanceledError`) abort immediately without retry.

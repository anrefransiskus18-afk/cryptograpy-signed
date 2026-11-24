# Error Handling Guidelines

## 1. Normalized Error Model (`src/utils/errors.ts` & `src/dto/apiError.dto.ts`)
All HTTP, network, validation, and cancellation failures are normalized into `AppError` (or extracted into user-facing strings via `extractApiError(err, fallback)`):
- `errorCode`: Machine-readable category (`ERR_CANCELED`, `NETWORK_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `HTTP_*`, etc.).
- `status`: HTTP status code when available.
- `message`: Safe, localized/user-friendly description that never exposes raw stack traces, private keys, passphrases, or JWT secrets.

## 2. Layer Responsibilities
1. **HTTP Interceptors (`src/api/interceptors.ts`)**:
   - Converts Axios cancellation (`CanceledError` / `ERR_CANCELED`) into `AppError` with `errorCode = "ERR_CANCELED"`.
   - Handles `401 Unauthorized` centrally by clearing session state and redirecting to `/login` when appropriate.
   - Normalizes backend FastAPI `detail` / validation payloads into structured `AppError` instances.
2. **Services (`src/services/*.ts`)**:
   - Performs client-side precondition checks (e.g., passphrase length/policy, required recipient key, file presence) before issuing network requests.
   - Never swallows errors with empty `catch {}` blocks.
3. **Views & `ErrorBoundary.vue`**:
   - Always catches as `catch (err: unknown)`.
   - Checks `if (isCanceledError(err)) return;` before surfacing errors to `AlertBanner` or `useToastStore().show(...)`.
   - `ErrorBoundary.vue` uses Vue's `onErrorCaptured` hook to catch unexpected rendering/lifecycle exceptions and present a safe recovery action.

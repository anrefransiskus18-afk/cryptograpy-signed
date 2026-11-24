# Error Monitoring

## 1. Error Classification (`frontend/src/utils/errors.ts`)
- `ValidationError` (`VALIDATION_ERROR`) — Client/form input constraint failures
- `AuthenticationError` (`HTTP_ERROR`, `401`) & `AuthorizationError` (`HTTP_ERROR`, `403`)
- `NetworkError` / `TimeoutError` (`NETWORK_ERROR`, `ECONNABORTED`)
- `ApiError` (`HTTP_ERROR`) — Backend HTTP 4xx/5xx normalized from FastAPI/Flask `detail`
- `CryptographyError` (`CRYPTO_ERROR`) — WebCrypto / integrity / `422 TAMPER_DETECTED`
- `UnexpectedError` (`UNEXPECTED_ERROR`)

## 2. Capture & Propagation
- **Component Subtree**: `ErrorBoundary.vue` (`onErrorCaptured`) catches rendering/lifecycle errors and offers safe state recovery.
- **API Interceptor**: Normalizes Blob error responses (`422` JSON from `/decrypt`), logs sanitized metadata (`api_request_failed`), clears session on `401`, and avoids logging credentials.
- **Cancellation Filtering**: `isCanceledError(err)` prevents aborted search/filter requests from triggering false error alerts or toast noise.

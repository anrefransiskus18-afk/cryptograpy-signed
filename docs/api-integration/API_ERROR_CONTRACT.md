# API Error Contract

## 1. Backend Error Envelope (`backend/app/__init__.py` & blueprints)
Standard FastAPI/Flask error payloads return:
```json
{ "detail": "Human-readable error message" }
```
or structured cryptographic integrity errors (HTTP `422`):
```json
{ "detail": { "error_code": "TAMPER_DETECTED", "message": "..." } }
```

## 2. Frontend Error Normalization (`src/utils/errors.ts` & `src/dto/apiError.dto.ts`)
| Condition | Normalized Class | `type` |
| :--- | :--- | :--- |
| Request aborted (`ERR_CANCELED`) | `AppError` (`errorCode: "ERR_CANCELED"`) | `UNEXPECTED_ERROR` (ignored in UI via `isCanceledError`) |
| Network / Timeout (`ECONNABORTED`) | `NetworkError` / `TimeoutError` | `NETWORK_ERROR` |
| `401 Unauthorized` | `AuthenticationError` | `HTTP_ERROR` |
| `403 Forbidden` | `AuthorizationError` | `HTTP_ERROR` |
| `422 TAMPER_DETECTED` | `CryptographyError` / `ApiError` | `CRYPTO_ERROR` / `HTTP_ERROR` |
| `400/404/405/413/429/500` | `ApiError` | `HTTP_ERROR` |

`extractApiError(err, fallback)` safely extracts user-facing strings without ever leaking tokens, private keys, or stack traces.

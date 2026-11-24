# API Integration Guidelines

## 1. Layered Request Pipeline
Every backend interaction follows a single unidirectional pipeline:

```text
Vue View / Composable
  → Application Service (src/services/*Service.ts)
  → Repository (src/repositories/*Repository.ts extends BaseRepository)
  → Centralized HTTP Client (src/api/httpClient.ts + interceptors.ts)
  → Backend FastAPI Endpoints
```

## 2. Rules & Conventions
- **Zero Direct Client Calls in UI**: Components and views must never import `axios` or `httpClient`.
- **Base URL & Environment Configuration**: `httpClient.ts` resolves `VITE_API_BASE_URL` (default `/api/v1`) with `timeout` configured centrally. Hardcoded backend URLs are forbidden.
- **Request Cancellation (`AbortController`)**: Filter/search and polling operations accept `{ signal?: AbortSignal }` from `useAsync` / view controllers and forward it through services and repositories to Axios. Superseded requests are aborted cleanly and ignored via `isCanceledError(err)`.
- **Typed DTO Contracts**:
  - Request DTOs (`LoginRequestDTO`, `EncryptDocumentRequestDTO`, `UserCreateRequestDTO`, etc.) serialize inputs (including `FormData` for multipart document upload/encryption).
  - Response DTOs (`DocumentListResponseDTO`, `AuditLogListResponseDTO`, `UserResponseDTO`, `MyKeyStatusResponseDTO`, `SystemSettingsDTO`, `BenchmarkResponseDTO`) normalize `Record<string, unknown>` payloads at the repository/service boundary.
- **File Download / Blob Handling**: Binary responses (`EncryptResultResponseDTO`, decrypted file blobs) read cryptographic telemetry headers (`x-document-id`, `x-encryption-time-ms`, `x-shannon-entropy`, `x-container-header`) and release `ObjectURL` handles after triggering download.

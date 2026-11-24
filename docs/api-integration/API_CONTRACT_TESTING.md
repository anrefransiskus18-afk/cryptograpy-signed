# API Contract Testing

## 1. Implemented Frontend Contract & Integration Tests
- [api-contract.test.js](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/tests/api-contract.test.js) (`4` tests):
  - Verifies every `API_ENDPOINTS` constant against canonical `/api/v1` backend routes.
  - Verifies `EncryptResultResponseDTO` parsing of `x-document-id`, `x-encryption-time-ms`, `x-shannon-entropy`, and `x-container-header`.
  - Verifies `EncryptDocumentRequestDTO.toFormData()` determinism for `wrap_mode` and `aad_json`.
  - Verifies `AuditFilterRequestDTO` and `BenchmarkResponseDTO` boundary defaults.
- [repositories.test.js](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/tests/repositories.test.js): Verifies `BaseRepository` GET/POST/PUT/PATCH/DELETE/getBlob, safe GET-only retry on `503`, no retry on `POST`/`PUT`/`DELETE`, cancellation handling, and `401`/`422` normalization.
- [integration.test.js](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/tests/integration.test.js): Tests Service → Repository → `httpClient` + Interceptors end-to-end with mocked transport, including `422` Blob JSON `TAMPER_DETECTED` and `401` cleanup.
- [dto-coverage.test.js](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/tests/dto-coverage.test.js) & [property-fuzz.test.js](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/tests/property-fuzz.test.js): Fuzzes DTO constructors and `Lazy.transform` with malformed/nullish payloads.

## 2. Execution Result
All `54/54` frontend tests (including the `4` contract tests above) passed (`0` failures, `0` skipped).

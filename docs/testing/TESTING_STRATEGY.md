# Testing Strategy — Frontend

**Project**: PT XYZ DocShield CMS (`frontend/`)  
**Date**: 2026-11-23  
**Runner**: Node.js built-in test runner (`node --import ./tests/register-loader.mjs --test tests/*.test.js`)

---

## 1. Testing Architecture & Suites

| Suite | Scope | Count |
| :--- | :--- | :--- |
| `tests/crypto-reliability.test.js` | AES-256-GCM matrix, ECDH P-256, HKDF-SHA256, NIST/RFC KAT vectors, 125 MiB boundary, `AadMetadataDTO`, `BaseRepository` GET dedupe, `Logger` | 13 |
| `tests/crypto-kat-and-signatures.test.js` | ECDSA P-256 SHA-256 signature verification, 256-sample CSPRNG IV uniqueness, 16x concurrent 64 KiB AES-GCM + SHA-256 stress test | 3 |
| `tests/property-fuzz.test.js` | Seeded (`0x20261123`) property & fuzz tests for AES-GCM, `sanitizeFilename`, `sanitizeCsvCell`, `sanitizeLogData`, `Lazy.transform` & DTOs, `computeSha256Hex` | 4 |
| `tests/security-hardening.test.js` | Path traversal, malformed PEM/AAD JSON, disallowed file extensions, recursive JWT/secret redaction, invalid WebCrypto key/IV lengths | 5 |
| `tests/integration.test.js` | `Service -> Repository -> httpClient + Interceptors` (422 Blob JSON `TAMPER_DETECTED`, 401 session cleanup, network errors) | 4 |
| `tests/repositories.test.js` | `BaseRepository` HTTP verbs, safe GET 503 retry, non-idempotent POST/PUT/DELETE no-retry, cancellation, endpoint routing | 6 |
| `tests/services.test.js` | All 10 domain services (`Encryption`, `Decryption`, `Crypto`, `Key`, `Auth`, `Document`, `User`, `Dashboard`, `Settings`, `Audit`) | 7 |
| `tests/stores.test.js` | Pinia `auth` & `toast` stores, `Lazy.transform` | 3 |
| `tests/dto-coverage.test.js` | `Audit`, `Key`, and `User` DTO normalization | 3 |
| `tests/validators-and-crypto.test.js` | Runtime boundary `validators.ts` & `computeSha256Hex` | 2 |

**Total**: **50 tests passing, 0 failed, 0 skipped**.

---

## 2. Execution Commands

```bash
cd frontend
npm run lint:arch        # Architecture, circular dependency & security hygiene
npm run typecheck        # vue-tsc --noEmit (strict TS + Vue template checking)
npm test                 # All 50 unit, integration, crypto, security, property & fuzz tests
npm run test:coverage    # V8 coverage report across src/
npm run check            # Full gate: lint:arch && typecheck && test && build
```

---

## 3. Known Tooling Gaps (Offline Environment)
- `@vue/test-utils` / `vitest` (DOM component mounting), `@playwright/test` (live browser E2E), `fast-check`, `stryker`, and `eslint` are not installed in `package.json` and require npm registry access to install.

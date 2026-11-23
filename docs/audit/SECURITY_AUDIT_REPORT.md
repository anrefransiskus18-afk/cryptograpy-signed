# Security & Cryptography Audit Report — Frontend

**Project**: PT XYZ DocShield CMS (`frontend/`)  
**Audit Date**: 2026-11-23  
**Reference Standards**: OWASP ASVS / Top 10, NIST SP 800-38D (AES-GCM), FIPS 180-4 (SHA-256), RFC 5869 (HKDF)

---

## 1. Cryptographic Implementation Review

- **Primitives & Provider**: Uses standard Web Crypto API (`crypto.subtle` and `crypto.getRandomValues`). Automated architecture check (`scripts/check-architecture.mjs`) verifies `Math.random()` is never used in `src/utils/crypto/`.
- **Algorithms Verified via Test Vectors (`tests/crypto-reliability.test.js`)**:
  - **AES-256-GCM**: Tested with roundtrips (empty, Unicode, binary, 1 MiB), wrong-key rejection, tampered-ciphertext rejection, tampered-AAD rejection, truncated ciphertext (`< 16` byte tag) rejection, and **NIST SP 800-38D Test Case 13** known-answer vector (`tag = 530f8afbc74536b9a963b4f1c4cb738b`).
  - **ECDH NIST P-256 + HKDF-SHA256**: Tested with SPKI key export/import, shared secret agreement, and **RFC 5869 Appendix A.1 Test Case 1** known-answer vector.
  - **SHA-256**: Tested against **NIST FIPS 180-4** `"abc"` vector in both `tests/crypto-reliability.test.js` and `src/utils/crypto/hashWorker.ts` (`tests/validators-and-crypto.test.js`).
- **Tamper Handling**: Backend `422` / `TAMPER_DETECTED` (including `Blob` JSON payloads from `/decrypt`) is parsed by `src/api/interceptors.ts`, mapped to `CryptographyError` (`ErrorType.CRYPTO`), and surfaced explicitly in `Decrypt.vue`.

---

## 2. Severity-Based Vulnerability Assessment

### HIGH
1. **JWT Token Stored in `localStorage` & Plaintext PKCS#8 PEM in `sessionStorage`**
   - **File**: `frontend/src/utils/sessionStorage.ts` (L6-L78), `frontend/src/api/interceptors.ts` (L34).
   - **Technical Explanation**: `jwt_token` is persisted in `localStorage` and injected into `Authorization: Bearer ...` headers; `local_pkcs8_private_key` is persisted in `sessionStorage`.
   - **Attack Scenario**: If an XSS vulnerability were ever introduced (e.g., via a future third-party script or unsafe template), attacker JavaScript could exfiltrate `localStorage.jwt_token` or `sessionStorage.local_pkcs8_private_key`.
   - **Business Impact**: Session hijacking or private key compromise for the active tab.
   - **Recommended Remediation**: Migrate authentication exclusively to `HttpOnly; Secure; SameSite=Lax/Strict` cookies (building on the `withCredentials: true` and `X-CSRF-Token` support already present in `interceptors.ts`) and keep private keys only in memory or as non-extractable `CryptoKey` objects in IndexedDB.
   - **Validation Method**: Verify `document.cookie` / `localStorage` contain no JWT after login and authenticated requests still succeed via `HttpOnly` cookie.

### MEDIUM
2. **External Google Fonts `<link>` Blocked by Strict Production CSP (REMEDIATED)**
   - **File**: `frontend/index.html`, `frontend/nginx.conf` (L20).
   - **Status**: **FIXED** — Removed external `fonts.googleapis.com` / `fonts.gstatic.com` `<link>` tags from `index.html` so `style-src 'self' 'unsafe-inline'; font-src 'self' data:` operates cleanly with zero CSP violations.

3. **Lack of Runtime Schema Validation for Arbitrary API Responses**
   - **File**: `frontend/src/lib/lazy.ts`, `frontend/src/repositories/BaseRepository.ts`.
   - **Technical Explanation**: `Lazy.transform` performs structural DTO construction rather than strict runtime type validation on every field; `src/utils/validators.ts` now provides runtime guards for new utilities/cancellation, but full DTO schema enforcement (e.g., Zod) is not yet applied across all endpoints.
   - **Recommended Remediation**: Add runtime schema validation at `BaseRepository` / DTO boundaries for critical responses.

### LOW
4. **Role-Based Route Guard Support (`router/index.ts`)**
   - **File**: `frontend/src/router/index.ts` (L1-L125).
   - **Status**: **MITIGATED** — Added typed `RouteMeta.roles` checking in `router.beforeEach`. Note that `/users` and `/settings` intentionally allow non-admin users in read-only/directory mode per existing product behavior, while backend enforces `403` on mutations.

### INFORMATIONAL
5. **Security Controls Verified Passing**:
   - **XSS Hygiene**: `0` `v-html`, `0` `eval()`, `0` `new Function()`.
   - **CSV Formula Injection (CWE-1236)**: Neutralized in `src/utils/file.ts` (`sanitizeCsvCell`) and verified by unit test.
   - **Log Secret Redaction**: `src/utils/logger.ts` masks private keys, passphrases, tokens, and plaintext (verified by unit test).
   - **Demo Credentials Guard**: `src/config/demo.ts` defaults `DEMO_MODE` to `false` in production builds unless explicitly enabled.

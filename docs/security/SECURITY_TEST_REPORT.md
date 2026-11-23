# Security Test Automation Report — Frontend

**Date**: 2026-11-23  
**Runner**: `node --import ./tests/register-loader.mjs --test tests/*.test.js`  
**Result**: **43/43 passed, 0 failed, 0 skipped**

---

## 1. Automated Security & Cryptography Test Suites

- **`tests/crypto-reliability.test.js`**:
  - AES-256-GCM roundtrips (empty, Unicode, binary, 1 MiB) + tampered ciphertext, wrong AAD, wrong key rejection.
  - ECDH NIST P-256 + HKDF-SHA256 key derivation.
  - **NIST SP 800-38D Test Case 13** AES-256-GCM known-answer vector + truncated ciphertext (`< 16` bytes) rejection.
  - **RFC 5869 Appendix A.1 Test Case 1** HKDF-SHA256 known-answer vector.
  - **NIST FIPS 180-4** SHA-256 `"abc"` known-answer vector.
- **`tests/security-hardening.test.js`** *(newly added)*:
  - `sanitizeFilename()` path traversal (`../../`, `..\\..\\`), null-byte/CRLF control char stripping, empty fallback.
  - `DecryptionService` rejection of malformed PEM private keys and invalid AAD JSON.
  - `EncryptionService` rejection of disallowed `.exe` extension and 0-byte files (plus 125 MiB boundary in `crypto-reliability.test.js`).
  - `Logger` recursive redaction of `private_key_pkcs8`, `passphrase`, `jwt_token`, and `plaintext`.
  - WebCrypto rejection of invalid AES key length (12 bytes), empty IV (0 bytes), and concurrent tampered AES-256-GCM payloads.
- **`tests/integration.test.js`**:
  - `422` Blob JSON `TAMPER_DETECTED` normalization and `401` session cleanup.
- **`tests/validators-and-crypto.test.js`**:
  - `computeSha256Hex` NIST SHA-256 digest and runtime type-guard assertions.

## 2. Environment Limitations
- `npm audit --audit-level=high` and `eslint` could not run in this offline sandbox without `registry.npmjs.org` access (configured in `.github/workflows/ci.yml` and `.gitlab-ci.yml`).
- Live browser E2E testing (Playwright) against running backend + Nginx is not configured in this repository.

# Threat Model (STRIDE) — Frontend Cryptography Application

**Project**: PT XYZ DocShield CMS — Frontend (`frontend/`)  
**Date**: 2026-11-23  

---

## 1. Assets, Trust Boundaries & Attack Surfaces

- **Critical Assets**: JWT access token (`jwt_token`), user PKCS#8 private key PEM (`local_pkcs8_private_key`), key passphrases, plaintext/encrypted documents (up to 125 MiB), AAD metadata, ECDSA P-256 audit chain signatures.
- **Trust Boundaries**:
  1. **User Input / File System $\rightarrow$ Browser UI & Services**: Untrusted filenames, `.pem` uploads, `.enc` files, JSON AAD, form inputs.
  2. **Browser Application $\rightarrow$ Browser Storage**: `localStorage` (`jwt_token`, `current_user`), `sessionStorage` (`local_pkcs8_private_key`, `local_key_fingerprint`).
  3. **Frontend HTTP Client $\rightarrow$ Nginx / Backend API**: TLS/HTTP boundary, CORS, CSRF (`X-CSRF-Token`), `Authorization: Bearer ...`, JSON/Blob responses.

---

## 2. STRIDE Threat Matrix

| STRIDE | Workflow / Surface | Threat Scenario | Risk | Mitigation Implemented / Recommended |
| :--- | :--- | :--- | :--- | :--- |
| **S** (Spoofing) | Authentication & Storage | XSS script reads `jwt_token` from `localStorage` | **High** | Strict CSP (`default-src 'self'`), 0 `v-html`/`eval`; **Open**: migrate to `HttpOnly` cookie session |
| **T** (Tampering) | File Decryption & Ciphertext | Attacker modifies 1 bit of `.enc` file or AAD | **High** | AES-256-GCM auth tag verification; `422 TAMPER_DETECTED` mapped to `CryptographyError`; `DecryptionService` validates AAD JSON |
| **T** (Tampering) | File Download / CSV Export | Malicious filename (`../../`) or CSV formula (`=CMD\|`) | **Medium** | `sanitizeFilename()` in `src/utils/file.ts`; `sanitizeCsvCell()` neutralizes CWE-1236 |
| **R** (Repudiation) | Audit Logs | Tampered audit entries | **Medium** | Server ECDSA P-256 signatures & SHA-256 hash chain verified via `/audit-logs/verify-chain` |
| **I** (Info Disclosure) | Logging & Errors | Private key, passphrase, JWT, or plaintext leaked to console | **High** | `src/utils/logger.ts` redacts `SENSITIVE_KEYS`, `SENSITIVE_KEY_PATTERN`, PEM blocks, `Bearer`, and JWT patterns |
| **I** (Info Disclosure) | Browser Key Storage | Plaintext PKCS#8 PEM in `sessionStorage` exposed to same-origin XSS | **High** | Cleared on logout/401 via `sessionStorage.ts`; **Open**: move to memory / non-extractable `CryptoKey` |
| **D** (Denial of Service) | File & PEM Upload | Oversized file (>125 MiB) or huge `.pem` file crashes tab | **Medium** | `EncryptionService`/`DecryptionService` enforce 125 MiB cap; `Decrypt.vue` caps `.pem` upload at 64 KiB; `AbortController` cancels stale queries |
| **E** (Elevation of Privilege) | Admin Routes & Clearances | Non-admin user accesses admin actions or lower-clearance recipient | **Medium** | `usePermissions` + `RouteMeta.roles` guard + backend RBAC `403` enforcement; `EncryptionService` checks clearance level |

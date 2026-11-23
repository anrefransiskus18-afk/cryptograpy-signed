# Security Hardening Report — Frontend

**Project**: PT XYZ DocShield CMS (`frontend/`)  
**Date**: 2026-11-23  

---

## 1. Implemented Security Hardening (This Pass)

1. **Filename & Path Traversal Sanitization ([file.ts](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/utils/file.ts#L6-L27))** (`MEDIUM`)
   - Added `sanitizeFilename()` stripping control characters (`\u0000-\u001f\u007f`), path separators (`/`, `\`), and `..` traversal sequences before `triggerBlobDownload()`.
2. **PEM & AAD Input Validation ([DecryptionService.ts](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/services/DecryptionService.ts#L56-L74), [Decrypt.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/views/Decrypt.vue#L232-L240))** (`MEDIUM`)
   - `DecryptionService.decrypt()` now validates PEM header/footer (`-----BEGIN` / `PRIVATE KEY-----`) and parses `aad_json` before sending requests.
   - `Decrypt.vue` enforces a `64 KB` ceiling on `.pem` file reads to prevent browser memory exhaustion.
3. **Structured Logger JWT & Pattern Redaction ([logger.ts](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/utils/logger.ts#L5-L66))** (`HIGH`)
   - Security testing discovered `jwt_token` was not in `SENSITIVE_KEYS`. Added `jwt_token`, `refresh_token`, `csrf_token`, `SENSITIVE_KEY_PATTERN`, and `JWT_PATTERN` (`eyJ...`) redaction.
4. **Nginx Browser Isolation Headers ([nginx.conf](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/nginx.conf#L16-L20))** (`LOW`)
   - Added `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` alongside `Content-Security-Policy` (`default-src 'self'`), `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.

---

## 2. Severity Classification Summary

| Severity | Finding | Status |
| :--- | :--- | :--- |
| **CRITICAL** | None observed in frontend codebase | — |
| **HIGH** | `jwt_token` in `localStorage` & plaintext PKCS#8 PEM in `sessionStorage` (`sessionStorage.ts`) | **Open** (requires backend `HttpOnly` cookie alignment) |
| **HIGH** | `jwt_token` not redacted by `Logger` (`logger.ts`) | **Fixed & Verified** |
| **MEDIUM** | Unsanitized download filenames, unvalidated PEM/AAD inputs, 64 KB `.pem` cap | **Fixed & Verified** |
| **MEDIUM** | Strict CSP vs Google Fonts CDN (`index.html`) | **Fixed & Verified** |
| **LOW** | Missing COOP/CORP headers (`nginx.conf`) | **Fixed & Verified** |
| **INFO** | `hashWorker.ts` falls back to `crypto.subtle.digest` under `default-src 'self'` CSP blocking `blob:` Workers | **Verified Fail-Safe** |

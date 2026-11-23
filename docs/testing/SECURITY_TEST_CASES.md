# Security Test Cases — Frontend

All cases below are automated in `tests/security-hardening.test.js`, `tests/property-fuzz.test.js`, `tests/crypto-reliability.test.js`, and `tests/integration.test.js`:

1. **Path Traversal & Filename Injection**: `sanitizeFilename("../../etc/passwd")`, `..\\..\\secret.pdf`, null/CRLF control chars, empty/dot-only inputs.
2. **CSV Formula Injection (CWE-1236)**: `sanitizeCsvCell` neutralizes `=`, `+`, `-`, `@`, `\t`, `\r` prefixes.
3. **Malformed Key & AAD Rejection**: `DecryptionService.decrypt` rejects non-PEM strings and malformed JSON AAD before hitting backend.
4. **File Upload Guardrails**: `EncryptionService.validateFile` rejects `.exe` (disallowed extension), `0`-byte files, and `>125 MiB` payloads.
5. **Log Redaction**: `sanitizeLogData` recursively redacts `private_key_pkcs8`, `passphrase`, `jwt_token`, `plaintext`, `Bearer` tokens, and `depth > 4` nested secrets.
6. **Backend Tamper & Auth Boundaries**: `422` Blob JSON `TAMPER_DETECTED` maps to `CryptographyError`; `401` triggers `clearAllSessionStorage()`.
7. **Demo Mode Safety**: `DEMO_MODE` defaults to `false` when `DEV` is falsy and `VITE_SHOW_DEMO_ACCOUNTS` is unset.

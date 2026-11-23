# Key Management Policy — Frontend

1. **Key Lifecycle**:
   - Key generation and rotation are orchestrated by `KeyService` (`src/services/KeyService.ts`) with minimum passphrase length validation (`>= 8` characters).
   - Rotation deactivates the prior active key on the backend and updates the local session fingerprint.
2. **Browser Storage & XSS Limitations**:
   - Currently, `src/utils/sessionStorage.ts` stores `jwt_token` in `localStorage` and `local_pkcs8_private_key` (PKCS#8 PEM) + `local_key_fingerprint` in `sessionStorage`.
   - **Important Security Limitation**: Neither `localStorage`, `sessionStorage`, nor even a non-extractable WebCrypto `CryptoKey` in IndexedDB protects against malicious JavaScript executing in the same origin (XSS). Therefore, strict CSP (`default-src 'self'`), zero `v-html`/`eval()`, and dependency hygiene are mandatory controls.
   - **Target State**: Migrate session auth to `HttpOnly` cookies and keep private keys in volatile memory or non-extractable `CryptoKey` handles only during active decryption.
3. **Cleanup & Redaction**:
   - Logout (`AuthService.logout`) and `401 Unauthorized` responses (`interceptors.ts`) immediately invoke `clearAllSessionStorage()`.
   - `src/utils/logger.ts` redacts all PEM blocks, passphrases, JWTs, and `Bearer` tokens before logging.

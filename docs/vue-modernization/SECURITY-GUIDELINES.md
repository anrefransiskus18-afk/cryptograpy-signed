# Frontend Security Guidelines — PT XYZ DocShield

1. **No Secrets in Client Bundles:** `src/config/demo.js` defaults `DEMO_MODE` to `false` in production builds (`vite build`) unless `VITE_SHOW_DEMO_ACCOUNTS=true` is explicitly set.
2. **XSS & Template Safety:** Never use `v-html` (enforced by `scripts/check-architecture.mjs`). Production Nginx sets `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.
3. **CSV Injection Defense:** All CSV exports go through `sanitizeCsvCell()` in `src/utils/file.js` (neutralizing leading `=`, `+`, `-`, `@`, `\t`, `\r`).
4. **Structured Log Sanitization:** All logs use `src/utils/logger.js` which redacts `password`, `passphrase`, `private_key*`, `token`, `authorization`, `secret`, `session_key`, `plaintext`, and `ciphertext`.
5. **Session & Auth Hygiene:** `router.beforeEach` validates both `jwt_token` and `current_user` JSON, clearing partial state; `httpClient` uses `withCredentials: true` for `HttpOnly` cookie support; `App.vue` blocks rendering the authenticated shell unless `authStore.isAuthenticated` is `true` after `router.isReady()`.

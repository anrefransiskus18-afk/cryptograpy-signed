# Remediation Changelog — PT XYZ Hybrid Cryptography Framework

**Date:** 2026-11-21

| File | Change Summary | Technical Reason |
|---|---|---|
| `frontend/src/config/demo.js` | Changed `DEMO_MODE` to opt-in (`VITE_SHOW_DEMO_ACCOUNTS === "true"`) in production while keeping `vite dev` enabled unless disabled. | Prevent demo credentials (`Admin@2026!`, `KeyPass@2026!`, `User@2026!`) from being bundled/auto-filled in production builds by default. |
| `frontend/src/utils/file.js` | Added `sanitizeCsvCell()` neutralizing `^[=+\-@\t\r]`; captured `window.URL` and deferred `revokeObjectURL` with `timer?.unref?.()`. | Prevent CSV formula injection (CWE-1236) in exported audit/auth logs and avoid premature blob URL revocation during downloads without breaking Node tests. |
| `frontend/nginx.conf` | Added `server_tokens off`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Content-Security-Policy`. | Harden static SPA delivery against clickjacking, MIME sniffing, and XSS. |
| `frontend/src/composables/useFormatters.js` | Added `debounced.cancel()` method to `debounce()`. | Allow components to cancel pending timers on unmount. |
| `frontend/src/views/AuditLogs.vue` | Gated "Verifikasi Rantai Audit" button with `canVerifyChain` (`isAdmin \|\| role === "EXECUTIVE"`) and added `onUnmounted` timer cleanup. | Match backend RBAC on `/api/v1/audit/verify-chain` and prevent post-unmount timer execution. |
| `frontend/src/App.vue` | Replaced `currentUser = ref(null)` with `computed(() => authStore.user)`. | Eliminate duplicate user state and ensure UI stays synchronized with Pinia `authStore`. |
| `backend/app/__init__.py` | Added `ProxyFix` (in production / `TRUST_PROXY=true`) and `@app.before_request` `X-Correlation-ID` validation/echo in `after_request`. | Ensure accurate client IP rate limiting/audit logging behind Nginx and end-to-end trace correlation. |
| `backend/app/cryptography/aes_engine.py` | Guarded `_USED_NONCE_REGISTRY` with `_NONCE_LOCK = threading.Lock()`. | Ensure thread-safe nonce uniqueness tracking under multi-threaded Gunicorn (`--threads 8`). |
| `backend/app/api/auth.py` | Wired `Config.RATE_LIMIT_LOGIN_MAX` & `Config.RATE_LIMIT_WINDOW_SECONDS`; added `<= 150` char bounds on `full_name` and `department` in `handle_update_me`. | Honor configured rate-limit settings and prevent oversized profile strings. |
| `backend/app/api/keys.py` | Added `check_rate_limit(f"keygen:{g.current_user['id']}", max_requests=10, window_seconds=60)` in `_generate_or_rotate_key`. | Mitigate CPU DoS from repeated 60k-iteration PBKDF2 + ECC keygen requests. |
| `backend/app/api/audit.py` | Synchronized `_RUNTIME_SETTINGS["container_format_version"]` with `default_key_wrap_mode` updates. | Keep reported container format metadata accurate (`HC01` vs `HC02`). |
| `frontend/tests/crypto-reliability.test.js` | Added unit tests for `sanitizeCsvCell`, `debounce.cancel()`, and `DEMO_MODE`. | Regression protection for security and lifecycle fixes. |
| `backend/tests/test_security_hardening.py` | Added tests for `X-Correlation-ID` echo/sanitization, security headers, `/api/v1/me` field bounds, `/api/v1/metrics`, and `HttpOnly` cookie auth. | Regression protection for backend hardening fixes. |
| `backend/Dockerfile` | Added dedicated non-root `appuser` and `chown -R appuser:appuser /app`. | Reduce container privilege blast radius in production. |
| `.github/workflows/ci.yml` | Added `pip-audit -r requirements.txt` to `backend-check`. | Automate Python dependency CVE scanning in CI. |
| `backend/app/api/auth.py`, `backend/app/core/permissions.py`, `frontend/src/api/httpClient.js` | Set `HttpOnly; SameSite=Lax` `access_token_cookie` on login/logout, accepted cookie fallback in `jwt_required`, enabled `withCredentials: true` and `Access-Control-Allow-Credentials: true`. | Enable `HttpOnly` cookie session transport while preserving Bearer token API compatibility. |
| `backend/app/services/AuditService.py` | Added `_CrossProcessLock` (`threading.Lock` + POSIX `fcntl.flock` on `storage/audit_chain.lock`). | Serialize audit hash-chain appends safely across threads and multi-worker processes on a host. |
| `backend/app/__init__.py` | Added Prometheus-compatible `/metrics` & `/api/v1/metrics` counters (`app_http_requests_total`, `app_http_errors_4xx_total`, `app_http_errors_5xx_total`). | Provide zero-dependency operational HTTP metrics without exposing sensitive data. |
| `backend/app/repositories/__init__.py`, `backend/app/api/documents.py`, `backend/app/api/users.py` | Extracted `DocumentRepository` and `UserRepository` and delegated list queries from route handlers. | Improve backend separation of concerns and query reusability. |
| `frontend/src/views/UserManagement.vue` | Added `onUnmounted(() => debouncedLoadUsers.cancel?.())`. | Prevent post-unmount debounced search callbacks. |

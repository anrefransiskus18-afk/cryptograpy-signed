# Security Audit — PT XYZ Hybrid Cryptography Framework

**Audit Date:** 2026-11-21  
**Frameworks Referenced:** OWASP Top 10 (2021), OWASP ASVS, CWE

---

## 1. Threat & Control Summary

- **Authentication:** Argon2id (`m=65536 KiB, t=2, p=4`, 16-byte CSPRNG salt) with timing-safe dummy verification (`burn_password_check`), account lockout via `authentication_logs` (`LOGIN_MAX_FAILED_ATTEMPTS = 5`, `LOGIN_LOCKOUT_SECONDS = 900`), HS256 JWT with `jti` revocation persisted in `revoked_tokens` and `password_changed_at` session invalidation.
- **Authorization:** Backend RBAC enforced via `@jwt_required(allowed_roles=..., min_clearance=...)`, document access filtered by `sender_id` / `DocumentRecipient` / admin clearance.
- **Secrets Management:** `Config.validate_for_production()` fails fast if `APP_ENV=production` uses default `JWT_SECRET_KEY`, `SEED_DEFAULT_PASSWORD`, `SEED_KEY_PASSPHRASE`, missing `DATABASE_URL`, or wildcard `CORS_ORIGINS`.

---

## 2. Security Findings & Remediations

### FINDING-SEC-01 (CRITICAL) — Production Demo Credentials Opt-Out Default (`DEMO_MODE`)
- **Affected File:** `frontend/src/config/demo.js`
- **Technical Issue:** `DEMO_MODE = import.meta.env?.VITE_SHOW_DEMO_ACCOUNTS !== "false"` defaulted to `true` when `VITE_SHOW_DEMO_ACCOUNTS` was omitted during `vite build`, bundling and auto-filling demo passwords (`Admin@2026!`, `KeyPass@2026!`, `User@2026!`) into production builds.
- **Root Cause:** Opt-out boolean logic instead of opt-in for production builds.
- **Remediation Performed:** Changed `DEMO_MODE` to require explicit `VITE_SHOW_DEMO_ACCOUNTS === "true"` in production while remaining enabled in `import.meta.env.DEV` unless disabled.
- **Validation Evidence:** Added regression test in `frontend/tests/crypto-reliability.test.js` verifying `DEMO_MODE === false` and `DEMO_PASSWORD === ""` outside `vite dev`.

### FINDING-SEC-02 (HIGH) — CSV Formula Injection (CWE-1236)
- **Affected File:** `frontend/src/utils/file.js`
- **Technical Issue:** `exportRowsToCsv` exported audit/auth log fields (e.g., `username_attempted`, `actor_identity`) without neutralizing leading formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **Remediation Performed:** Added `sanitizeCsvCell()` to prefix values matching `/^[=+\-@\t\r]/` with `'`.
- **Validation Evidence:** Unit tested in `frontend/tests/crypto-reliability.test.js`.

### FINDING-SEC-03 (HIGH) — Missing Rate Limiting on Key Generation/Rotation & Hardcoded Login Rate Limit
- **Affected Files:** `backend/app/api/keys.py`, `backend/app/api/auth.py`
- **Technical Issue:** `/api/v1/keys/generate` and `/api/v1/keys/rotate` had no rate limit despite executing 60,000-iteration PBKDF2 + ECC P-256 keygen (CPU DoS). `auth.py` hardcoded `max_requests=30` instead of `Config.RATE_LIMIT_LOGIN_MAX`.
- **Remediation Performed:** Added `check_rate_limit(f"keygen:{g.current_user['id']}", max_requests=10, window_seconds=60)` in `keys.py` and wired `Config.RATE_LIMIT_LOGIN_MAX` / `Config.RATE_LIMIT_WINDOW_SECONDS` in `auth.py`.

### FINDING-SEC-04 (HIGH) — Reverse-Proxy IP Resolution & Missing Nginx Security Headers
- **Affected Files:** `backend/app/__init__.py`, `frontend/nginx.conf`
- **Technical Issue:** Behind Nginx reverse proxy, `request.remote_addr` resolved to proxy IP instead of client IP, breaking per-IP rate limits and audit IP logs. `nginx.conf` also lacked `server_tokens off`, `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- **Remediation Performed:** Enabled `ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)` in `create_app()` for production/`TRUST_PROXY=true`, and added hardened HTTP security headers to `frontend/nginx.conf`.

### FINDING-SEC-05 (MEDIUM) — RBAC UI Parity on Audit Chain Verification & Profile Field Bounds
- **Affected Files:** `frontend/src/views/AuditLogs.vue`, `backend/app/api/auth.py`
- **Technical Issue:** Non-admin/non-executive users saw the "Verifikasi Rantai Audit" button that always returned HTTP 403. Backend `handle_update_me` lacked length limits on `full_name` and `department`.
- **Remediation Performed:** Gated the button with `canVerifyChain` (`isAdmin || role === "EXECUTIVE"`) and added `<= 150` char validation in `handle_update_me` (verified in `backend/tests/test_security_hardening.py`).

---

## 3. Unverified Infrastructure / External Dependencies
- **Browser Token Storage:** JWT is stored in `localStorage` (`jwt_token`) and encrypted PKCS#8 private key PEM in `sessionStorage`. HttpOnly cookies are not used; XSS prevention relies on CSP, absence of `v-html`, and Vue template escaping.
- **OS/Network TLS:** TLS termination (HTTPS/HSTS) is expected at an external ingress/load balancer in front of `nginx.conf` (port 5173).
- **`npm audit`:** Cannot reach `registry.npmjs.org` inside the offline sandbox (`EAI_AGAIN`). Must be run in CI/networked environment.

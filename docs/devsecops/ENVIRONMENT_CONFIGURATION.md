# Environment Configuration

## 1. Environment Separation
Template files in repository root:
- `.env.example` — Local development baseline
- `.env.staging.example` — Staging overrides
- `.env.production.example` — Production template (requires secret injection at deploy time)

## 2. Backend Variables (`backend/app/core/config.py`)
- `APP_ENV` (`development` | `staging` | `production`), `TRUST_PROXY`
- `DATABASE_URL`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`
- `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` (`120`)
- `SEED_DEFAULT_PASSWORD`, `SEED_KEY_PASSPHRASE`
- `CORS_ORIGINS`, `DEFAULT_KEY_WRAP_MODE` (`XOR_AAD` or `AES_GCM_KW`)
- `MAX_CONTENT_LENGTH` (`125 MiB`), `RATE_LIMIT_LOGIN_MAX` (`20` per `60s`), `LOGIN_MAX_FAILED_ATTEMPTS` (`5` / `15m` lockout)

## 3. Frontend Build-Time Variables
- `VITE_API_BASE_URL` (production Docker build sets `/api/v1`; local default `http://localhost:8000/api/v1`)
- `VITE_SHOW_DEMO_ACCOUNTS` (must be `"false"` in staging/production builds)
- No private keys, JWT signing secrets, or database credentials are placed in `VITE_*` variables.

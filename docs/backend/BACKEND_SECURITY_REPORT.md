# Backend Security Report

## 1. Authentication, Password Hashing & Lockout
- **Password Hashing (`core/security.py`)**: Argon2id (`m=65536 KiB`, `t=2`, `p=4`, 16-byte CSPRNG salt, 32-byte output) in PHC format; PBKDF2-HMAC-SHA256 verification fallback.
- **Rate Limiting & Lockout (`core/config.py`)**: Sliding-window per-IP rate limiting (`RATE_LIMIT_LOGIN_MAX=20` per `60s`) and account lockout (`LOGIN_MAX_FAILED_ATTEMPTS=5`, `15m` lockout).
- **Token Revocation**: In-memory `_REVOKED_TOKENS` blocklist (`jti -> exp`).
- **Production Startup Guard (`Config.validate_for_production`)**: Blocks startup when `APP_ENV=production` if `JWT_SECRET_KEY`, `DATABASE_URL`, `SEED_DEFAULT_PASSWORD`, `SEED_KEY_PASSPHRASE`, or `CORS_ORIGINS` use insecure defaults.

## 2. Cryptographic & Audit Integrity
- **Hybrid Container (`container_format.py`)**: `HC01` (129-byte header: 4B magic, 65B `Q_eph`, 32B `C_key`, 12B IV, 16B GCM tag) and `HC02` (145-byte header with 48B `C_key` AES-GCM key-wrap). Validates uncompressed SEC1 `0x04` point prefix, lengths, and GCM auth tag; raises `TamperDetectedError` on mismatch.
- **Tamper-Evident Audit Chain (`api/audit.py`)**: `AuditLog` rows link via `prev_log_hash` (SHA-256) and are signed with server ECDSA P-256 (`server_audit_key.pem`).

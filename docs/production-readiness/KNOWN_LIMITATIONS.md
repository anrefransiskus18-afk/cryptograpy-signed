# Known Limitations

1. **Offline Sandbox Tooling (`REM-11`)**: `eslint`, `prettier`, `@vue/test-utils`, `@playwright/test`, `npm audit`, `pip-audit`, and backend `pytest` (requires `flask`/PyPI packages) could not execute in this offline sandbox and depend on CI or a networked runner.
2. **Client Token Storage (`REM-10`)**: `jwt_token` remains in `localStorage` until backend authentication is migrated to `HttpOnly` cookie sessions.
3. **Process-Local Backend Security State (`BE-03`)**: `_REVOKED_TOKENS`, `_RATE_BUCKETS`, and Prometheus counters are stored in-memory per process; multi-worker Gunicorn scaling requires Redis / shared Prometheus collector.
4. **Local Database Fallback**: Local non-Docker development falls back to SQLite (`hybrid_crypto.db`), whereas Docker production uses MySQL 8.0.

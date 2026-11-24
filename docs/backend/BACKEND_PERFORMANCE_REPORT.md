# Backend Performance Report

## 1. Concurrency, Limits & Timing
- **Upload Bound**: `MAX_CONTENT_LENGTH` defaults to `125 MiB` (`125 * 1024 * 1024` bytes) to support 100 MiB document encryption benchmarks cleanly.
- **Request Timing & Metrics**: `after_request` measures request elapsed time using `time.perf_counter()` under `_metrics_lock` and exports totals at `/api/v1/metrics`.
- **Audit Chain Verification**: Uses keyset pagination (`AuditLog.id > last_id`, `limit(500)`) to avoid loading the entire `audit_logs` table into memory at once.

## 2. Known Bottlenecks / Limitations
- In-memory `_REVOKED_TOKENS`, `_RATE_BUCKETS`, and `_metrics_state` are process-local (`threading.Lock`); multi-worker Gunicorn deployments should move rate limiting and token revocation to a shared store (e.g., Redis) for horizontal consistency.

# Performance Monitoring

## 1. Frontend Instrumentation
- **API Request Latency**: `interceptors.ts` records `performance.now()` at request start and logs `durationMs` on completion/failure.
- **Cryptographic Timing**: `EncryptResultResponseDTO` reads `X-Encryption-Time-Ms` and `X-Shannon-Entropy` returned by `/api/v1/encrypt`; `Settings.vue` renders backend benchmark throughput (`MB/dtk`) and latency (`ms`) metrics.
- **Worker Execution**: `hashWorker.ts` offloads SHA-256 hashing with `correlationId` tracking and a `30s` timeout guard.

## 2. Backend Instrumentation
- `backend/app/__init__.py` tracks cumulative `duration_seconds_sum` and `duration_seconds_count` across HTTP requests using `time.perf_counter()` protected by `_metrics_lock` and exposes them on `/api/v1/metrics`.

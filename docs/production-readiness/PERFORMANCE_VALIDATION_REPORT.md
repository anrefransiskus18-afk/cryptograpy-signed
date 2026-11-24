# Performance Validation Report

## 1. Measured Build & Bundle Output (`vite build`)
- **Modules Transformed**: `217` in `9.49s` (`sourcemap: false`)
- **Vendor Chunks**: `vue-vendor` (`105.35 kB`, gzip `40.94 kB`), `http-vendor` (`59.03 kB`, gzip `22.15 kB`)
- **Entry Chunk**: `index` (`54.33 kB`, gzip `18.89 kB`), CSS (`29.63 kB`, gzip `5.94 kB`)
- **Route Chunks**: Lazy-loaded per view (`4.84 kB` – `19.20 kB` raw)

## 2. Runtime Optimizations Verified
- `shallowRef` for large DTO lists (`Documents.vue`, `AuditLogs.vue`, `UserManagement.vue`, `Decrypt.vue`).
- `AbortController` cancellation on superseded list/filter requests.
- `BaseRepository` GET in-flight deduplication and safe transient retry (`502/503/504` on `GET`/`getBlob` only).
- `hashWorker.ts` off-main-thread SHA-256 with `30s` timeout guard.
- Concurrent WebCrypto stress test (`16` concurrent `64 KiB` AES-256-GCM + SHA-256 ops) passed in `npm test`.

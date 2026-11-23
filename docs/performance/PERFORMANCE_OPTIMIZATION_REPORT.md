# Performance Optimization Report — Frontend

**Date**: 2026-11-23  

---

## 1. Implemented Optimizations

1. **Shallow Reactivity for Large DTO Lists**:
   - Converted `documents` ([Documents.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/views/Documents.vue)), `auditLogs` & `authLogs` ([AuditLogs.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/views/AuditLogs.vue)), `users` ([UserManagement.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/views/UserManagement.vue)), and `storedDocuments` ([Decrypt.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/views/Decrypt.vue)) from deep `ref` to `shallowRef` to eliminate recursive reactive proxy overhead on large arrays.
2. **Web Worker Offloading with Correlation ID & Timeout ([hashWorker.ts](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/utils/crypto/hashWorker.ts))**:
   - Added typed `HashWorkerRequest` / `HashWorkerResponse`, `correlationId` validation, `30_000ms` timeout guard, transferable `ArrayBuffer` transfer, `worker.terminate()`, and automatic `crypto.subtle.digest` fallback.
3. **Bundle Splitting, Compression & Caching**:
   - [vite.config.ts](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/vite.config.ts): Route-level lazy imports + `vue-vendor` (`105.35 kB` / `40.94 kB` gzip) & `http-vendor` (`59.03 kB` / `22.15 kB` gzip).
   - [nginx.conf](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/nginx.conf): `gzip on`, 1-year `immutable` caching on `/assets/`, `no-store` on `index.html`.
   - `Encrypt-*.js` route chunk reduced from `8.48 kB` (`3.31 kB` gzip) to `7.79 kB` (`3.28 kB` gzip) after adopting `BaseSelect` / `BaseInput` / `BaseButton`.
4. **Network & Cancellation**:
   - `BaseRepository` GET deduplication + `AbortController` cancellation across `Documents.vue`, `UserManagement.vue`, and `AuditLogs.vue`.

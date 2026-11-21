# Performance Guidelines — PT XYZ DocShield

1. **Route-Level Code Splitting:** All 10 routes in `src/router/index.js` use lazy `import("../views/...")` chunks.
2. **Pre-Mount Router Readiness:** `src/main.js` waits for `router.isReady()` before `app.mount("#app")` to prevent layout thrashing and unauthenticated dashboard flashes.
3. **Timer & Abort Cleanup:** Debounced inputs expose `.cancel()` (`useFormatters.js`) and clear timers in `onUnmounted` (`AuditLogs.vue`, `UserManagement.vue`, `Documents.vue`); `useAsync` aborts pending requests on unmount.
4. **Request Deduplication:** `BaseRepository` deduplicates simultaneous identical `GET` requests via `_inFlightGets`.
5. **Blob Memory Cleanup:** `triggerBlobDownload` defers `URL.revokeObjectURL` safely so large `.enc` or decrypted downloads are never aborted prematurely.
6. **Production Build:** `build.sourcemap: false` in `vite.config.js` keeps bundle sizes compact (`160` modules, main chunk `202.24 kB` / `75.43 kB` gzipped).

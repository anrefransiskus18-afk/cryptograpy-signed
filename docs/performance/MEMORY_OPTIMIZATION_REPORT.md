# Memory Optimization & Cleanup Report

**Date**: 2026-11-23  

---

## 1. Implemented Cleanup Controls
- **Object URLs**: `triggerBlobDownload()` ([file.ts](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/utils/file.ts)) revokes `URL.createObjectURL(blob)` via `URL.revokeObjectURL` after a `1000ms` `.unref()` timer.
- **Web Workers**: `computeSha256Hex()` ([hashWorker.ts](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/utils/crypto/hashWorker.ts)) transfers ownership of `ArrayBuffer` (`[transferable]`), clears its `30s` timer, calls `worker.terminate()`, and revokes the Blob Worker URL in `finally`.
- **DOM Listeners & Timers**: `BaseModal.vue` removes `window` `keydown` listeners in `onBeforeUnmount`; `Documents.vue`, `UserManagement.vue`, and `AuditLogs.vue` abort active `AbortController`s and cancel `debounce` timers in `onUnmounted`.
- **PEM Upload Cap**: `Decrypt.vue` rejects `.pem` uploads `> 64 KB` before `FileReader.readAsText()`.

## 2. JavaScript Memory Limitation Note
- JavaScript garbage collection does not guarantee immediate or physical zeroization of all copies of sensitive strings/buffers in browser memory.

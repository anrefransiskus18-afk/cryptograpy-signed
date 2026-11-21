# Performance & Scalability Audit — PT XYZ Hybrid Cryptography Framework

**Audit Date:** 2026-11-21

---

## 1. Startup & Bundle Performance (Frontend)
- **Route Lazy Loading:** All 10 routes in `frontend/src/router/index.js` use dynamic `import("../views/...")` code splitting.
- **Production Sourcemaps:** `build.sourcemap: false` in `frontend/vite.config.js` prevents exposing original source maps in production bundles.
- **Dead-Code Elimination for Demo Credentials:** With `DEMO_MODE` gated by `import.meta.env.DEV` / `VITE_SHOW_DEMO_ACCOUNTS === "true"`, production builds strip demo credential branches.

---

## 2. Runtime, Cryptography & Memory Management
- **Backend AES-GCM Chunking:** `AESEngine.encrypt_gcm` and `decrypt_gcm` process payloads > 1 MiB using `memoryview` in 1 MiB chunks (`STREAM_CHUNK_SIZE = 1048576`).
- **ECC Keygen PBKDF2 Cost:** `ECCEngine.generate_keypair` uses `iteration_count=60000` for PKCS#8 private key protection, balancing brute-force resistance with responsive key generation/seeding in pure-Python `pycryptodome`.
- **N+1 Query Avoidance:** `backend/app/api/users.py` uses `_active_key_map()` to batch-load active public keys; `backend/app/api/audit.py` batch-loads `Document.original_filename` for displayed logs and verifies the audit chain in 500-row batches (`verify_audit_chain`).
- **Frontend Blob URL Cleanup:** `frontend/src/utils/file.js` defers `URL.revokeObjectURL` by 1000ms (`.unref()`-safe in Node) to avoid aborting browser downloads while still releasing object URLs.
- **Scalability Constraint (Documented):** Backend runs Gunicorn with `--workers 1 --threads 8` (`backend/Dockerfile`, `start_production.sh`) because `_AUDIT_CHAIN_LOCK` (`threading.Lock`) and `_RATE_BUCKETS` are in-process. Horizontal multi-worker scaling would require a distributed lock / Redis rate limiter and DB-level advisory locking for the audit hash chain.

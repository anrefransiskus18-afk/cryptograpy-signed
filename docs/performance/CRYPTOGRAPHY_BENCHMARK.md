# Cryptography Benchmark Report

**Date**: 2026-11-23  
**Runtime**: Node.js `v22.22.1` WebCrypto (`webcrypto.subtle`)

---

## 1. Measured Single-Operation Latency (AES-256-GCM + SHA-256)

| Payload Size | AES-256-GCM Encrypt | AES-256-GCM Decrypt | SHA-256 Digest |
| :--- | :--- | :--- | :--- |
| `1 KiB` | `2.54 ms` | `0.87 ms` | `1.73 ms` |
| `64 KiB` | `1.98 ms` | `0.70 ms` | `0.66 ms` |
| `1 MiB` | `6.72 ms` | `6.46 ms` | `8.70 ms` |

## 2. Concurrent Stress Benchmark
- **16 concurrent `64 KiB` AES-256-GCM encrypt/decrypt + `computeSha256Hex` operations**: Completed in **`164.59 ms`** (`tests/crypto-kat-and-signatures.test.js`) with zero cross-contamination or auth tag errors.
- No cryptographic parameters or work factors were weakened.

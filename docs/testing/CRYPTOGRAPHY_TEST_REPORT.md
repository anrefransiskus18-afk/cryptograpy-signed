# Cryptography Test Report — Frontend

**Date**: 2026-11-23  
**Suites**: `tests/crypto-reliability.test.js`, `tests/crypto-kat-and-signatures.test.js`, `tests/property-fuzz.test.js`, `tests/security-hardening.test.js`

---

## 1. Known-Answer Test Vectors (KAT)
- **NIST SP 800-38D Test Case 13 (AES-256-GCM)**: Zero 256-bit key, zero 96-bit IV, empty plaintext/AAD $\rightarrow$ verified exact 128-bit authentication tag `530f8afbc74536b9a963b4f1c4cb738b`.
- **RFC 5869 Appendix A.1 Test Case 1 (HKDF-SHA256)**: Verified exact 42-byte OKM `3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865`.
- **NIST FIPS 180-4 (SHA-256 `"abc"`)**: Verified exact digest `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` via both `webcrypto.subtle.digest` and `computeSha256Hex`.

## 2. Security Properties & Adversarial Tests
- **ECDSA P-256 + SHA-256**: Valid signature passes; modified message, wrong public key, and truncated signature all fail verification.
- **IV Uniqueness**: 256 consecutive 96-bit IVs from `crypto.getRandomValues` verified 100% unique.
- **Property-Based & Fuzz (`seed=0x20261123`)**: 25 randomized plaintexts + AADs + Unicode/control-char cases pass roundtrip and reject single-bit tampering; invalid AES key length (12 bytes), empty IV, and truncated ciphertext (`< 16` bytes) all reject.
- **Concurrency & Stress**: 16 concurrent 64 KiB AES-256-GCM + SHA-256 operations complete cleanly with zero cross-contamination.

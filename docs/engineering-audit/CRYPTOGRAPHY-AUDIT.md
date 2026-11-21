# Cryptography Audit — PT XYZ Hybrid Cryptography Framework

**Audit Date:** 2026-11-21  
**Scope:** `backend/app/cryptography/*.py`, `backend/app/core/security.py`, `frontend/src/utils/crypto/tamperSimulator.js`

---

## 1. Cryptographic Architecture & Protocol Assessment

| Component | Algorithm / Standard | Parameters | Assessment |
|---|---|---|---|
| **Symmetric Encryption** | AES-256-GCM (NIST FIPS 197, SP 800-38D) | 256-bit session key, 96-bit CSPRNG nonce, 128-bit GCM tag, 1 MiB chunked streaming | **Sound.** Authentication tag verified before plaintext release. |
| **Asymmetric / Key Agreement** | Ephemeral-Static ECDH on NIST P-256 (`secp256r1`) | Fresh ephemeral `(d_eph, Q_eph)` per document; `0x04 \|\| X \|\| Y` (65B) | **Sound.** Forward-secret per-document ephemeral keys. |
| **KDF** | HKDF-SHA256 (RFC 5869) | `salt = SHA256(Q_eph)`, domain-separated `info` (`V1` / `KEYWRAP-V2`) | **Sound.** |
| **Container Formats** | `HC01` (129B header, `XOR_AAD`) & `HC02` (145B header, `AES_GCM_KW`) | `bound_aad = magic \|\| Q_eph \|\| C_key \|\| canonical_aad` | **Sound.** `HC01` XOR malleability mitigated by binding `C_key` and `Q_eph` into AES-GCM GHASH AAD. |
| **Key Storage** | PKCS#8 Encrypted PEM | PBKDF2-HMAC-SHA256 (60,000 iterations) + AES-256-CBC | **Sound.** |
| **Password Hashing** | Argon2id (RFC 9106) | `m=65536 KiB, t=2, p=4`, 16B CSPRNG salt, 32B tag | **Sound.** Auto-upgrades legacy PBKDF2 hashes on login. |
| **Audit Integrity** | Hash Chain + ECDSA P-256 | `SHA256(prev_id \| ts \| prev_sig)` + ECDSA P-256 server signature | **Sound.** Detects deletion/insertion/modification of non-tail records. |

---

## 2. Findings & Remediations

### FINDING-CRYPTO-01 (HIGH) — Non-Thread-Safe Nonce Registry in `AESEngine`
- **Affected File:** `backend/app/cryptography/aes_engine.py`
- **Technical Issue:** `_USED_NONCE_REGISTRY` (`set`) was checked, cleared, and updated in `generate_unique_nonce()` without synchronization, risking race conditions under multi-threaded Gunicorn (`--threads 8`).
- **Remediation Performed:** Added `_NONCE_LOCK = threading.Lock()` around all reads, clears, and insertions on `_USED_NONCE_REGISTRY`.
- **Validation Evidence:** `backend/tests/test_crypto_engine.py` (6/6 tests) passed after edit.

---

## 3. Compatibility & Verification Matrix
- Backend `test_crypto_engine.py` validates: ECC P-256 PKCS#8 keygen, ECDH + HKDF-SHA256 consistency, AES-256-GCM entropy & avalanche effect, `HC01` container offsets, `HC02` `AES_GCM_KW` mode, and tamper detection across header/IV/tag/ciphertext/AAD/wrong-key scenarios.
- Frontend `crypto-reliability.test.js` validates WebCrypto (`node:crypto` `webcrypto.subtle`) AES-256-GCM (empty, UTF-8, binary, 1 MiB, tamper) and ECDH NIST P-256 + HKDF-SHA256 compatibility.

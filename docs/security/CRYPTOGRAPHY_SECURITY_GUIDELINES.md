# Cryptography Security Guidelines — Frontend

1. **Approved Primitives Only**:
   - Use Web Crypto API (`crypto.subtle`, `crypto.getRandomValues`) exclusively for symmetric encryption (`AES-256-GCM`), key agreement (`ECDH` NIST `P-256`), key derivation (`HKDF-SHA256`), and hashing (`SHA-256`).
   - `Math.random()` is strictly prohibited in `src/utils/crypto/` (enforced by `scripts/check-architecture.mjs`).
2. **Authenticated Encryption & Nonce Discipline**:
   - Always use `AES-GCM` with 256-bit keys and unique 96-bit (12-byte) IVs from `crypto.getRandomValues`. Never reuse an `(key, iv)` pair.
   - Bind contextual metadata via `additionalData` (AAD). Never ignore authentication tag failures or return partial plaintext on `TAMPER_DETECTED` (`422`).
3. **No Custom Algorithms & No Silent Fallbacks**:
   - Never implement custom ciphers or silently downgrade parameters.
   - `src/utils/crypto/hashWorker.ts` uses `crypto.subtle.digest("SHA-256")` inside a Web Worker and falls back only to standard `crypto.subtle.digest("SHA-256")` on the main thread when `Worker`/`blob:` is unavailable.
4. **Protocol Compatibility**:
   - Preserve backend container format (`HC01` / `HC02`, `XOR_AAD` / `AES_GCM_KW`) and `AadMetadataDTO` deterministic serialization.

# Cryptography API Compatibility

## 1. Binary Container & Header Contract (`HC01` / `HC02`)
- **`HC01` (129-byte fixed prefix, `XOR_AAD`)**: `4B Magic ("HC01") || 65B Q_eph (0x04||X||Y) || 32B C_key || 12B IV || 16B GCM Tag || Ciphertext`
- **`HC02` (145-byte fixed prefix, `AES_GCM_KW`)**: `4B Magic ("HC02") || 65B Q_eph || 48B C_key (32B + 16B KW tag) || 12B IV || 16B GCM Tag || Ciphertext`
- Both modes use **AES-256-GCM**, **ECC NIST P-256** (Ephemeral-Static ECDH), and **HKDF-SHA256**.

## 2. Multipart & Response Header Contract
- **Encrypt (`POST /api/v1/encrypt`)**: Accepts `document` (`File`), `recipient_key_id`, `aad_json`, and `wrap_mode` (`XOR_AAD` | `AES_GCM_KW`). Returns binary `.enc` `Blob` + exposed headers:
  - `X-Document-Id`
  - `X-Encryption-Time-Ms`
  - `X-Shannon-Entropy`
  - `X-Container-Header` (`HC01` | `HC02`)
- **Decrypt (`POST /api/v1/decrypt`)**: Accepts `encrypted_document` (`File`) + private key / passphrase + optional `document_id`. Returns plaintext `Blob` + `X-GCM-Auth-Status` or HTTP `422` Blob JSON (`TAMPER_DETECTED`).
- All exposed headers are explicitly whitelisted in `backend/app/__init__.py` (`Access-Control-Expose-Headers`).

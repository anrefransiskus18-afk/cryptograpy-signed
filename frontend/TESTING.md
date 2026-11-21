# Testing Architecture & Engineering Guide

## 1. Piramida & Cakupan Testing

- **Repository Unit Tests (`tests/repositories.test.js`)**: Menguji `BaseRepository` dan seluruh 8 domain Repository (`Auth`, `Crypto`, `Document`, `Key`, `User`, `Audit`, `Dashboard`, `Settings`) menggunakan mock HTTP client (GET/POST/PUT/PATCH/DELETE/Blob, safe GET retry, request cancellation, timeout, 401, 422 `TAMPER_DETECTED`).
- **Service Unit Tests (`tests/services.test.js`)**: Menguji seluruh 10 Service (`Encryption`, `Decryption`, `Crypto`, `Key`, `Auth`, `Document`, `User`, `Dashboard`, `Settings`, `Audit`) dengan mock Repository/Store (Dependency Injection).
- **Cryptography Reliability Matrix (`tests/crypto-reliability.test.js`)**: Menguji AES-256-GCM (roundtrip, empty, Unicode UTF-8, binary, 1 MiB payload, tampered ciphertext, AAD mismatch, wrong key), ECDH NIST P-256 + HKDF-SHA256 + SPKI key import/export, vector resmi NIST SHA-256 (`"abc"`), `AadMetadataDTO`, batas 125 MiB, deduplikasi GET, dan sanitasi log.
- **Layer Integration Tests (`tests/integration.test.js`)**: Menguji alur penuh `Service → Repository → Axios httpClient + attachInterceptors` (JWT header injection, `X-Correlation-ID`, Blob JSON error parsing 422, cleanup session 401, network failure propagation).

## 2. Perintah Eksekusi

```bash
cd frontend
npm run lint:arch        # Validasi boundary, circular dependency, dan security hygiene
npm test                 # Jalankan seluruh unit, crypto, dan integration tests
npm run test:coverage    # Jalankan seluruh test + laporan V8 coverage
npm run test:integration # Jalankan khusus integration test antar-layer
npm run check            # Jalankan lint:arch + test + production build
```

## 3. Konvensi Penulisan Test
- Gunakan `node:test` dan `node:assert/strict` (tanpa ketergantungan eksternal).
- **Dilarang keras** menggunakan kredensial, JWT, atau private key produksi di dalam file test.
- Setiap test harus memverifikasi perilaku, hasil transformasi, atau error type (`AppError` / `ErrorType`), bukan sekadar memverifikasi fungsi terpanggil.
- Untuk test integrasi dengan `attachInterceptors`, gunakan stub Axios `adapter` dan `withMockBrowserGlobals()` agar tidak menyentuh jaringan asli dan tidak meninggalkan state global.

## 4. Menambahkan Test Vector Kriptografi Baru
- Tambahkan kasus pada `tests/crypto-reliability.test.js` menggunakan `webcrypto.subtle` dan vektor deterministik (mis. NIST CAVP/FIPS).
- Pastikan kasus negatif (key salah, AAD berubah, ciphertext berubah 1-bit) selalu melempar error autentikasi.

## 5. Keterbatasan Saat Ini (Component DOM & E2E)
- `@vue/test-utils` (component DOM rendering) dan `@playwright/test` (E2E browser & visual screenshot) belum terpasang di `package.json`. Ketika ditambahkan pada environment dengan akses registry npm, tambahkan tahapannya ke `.github/workflows/ci.yml`.

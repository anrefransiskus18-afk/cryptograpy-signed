# Testing Strategy — PT XYZ DocShield

## 1. Automated Quality Gates (`npm run check`)
1. **Architecture, Cycle & Security Check (`npm run lint:arch`):** Scans all `74` files in `src/` for layer boundary violations, circular imports, `console.*` leaks, `v-html`, `eval`, and hardcoded secrets.
2. **Unit, Crypto & Integration Suite (`npm test`):** `32/32` tests passing via Node native test runner (`node --test`):
   - `crypto-reliability.test.js` (13 tests): WebCrypto AES-256-GCM, ECDH P-256 + HKDF-SHA256, DTOs, CSV injection defense, `DEMO_MODE`, `i18n` (`id`/`en`), typed error classes, `useTheme`, `usePermissions`.
   - `integration.test.js` (4 tests): Full Service -> Repository -> `httpClient` + Interceptors pipeline, 422 Blob `TAMPER_DETECTED`, 401 cleanup.
   - `repositories.test.js` (6 tests), `services.test.js` (6 tests), `stores.test.js` (3 tests).
3. **Coverage (`npm run test:coverage`):** `82.21%` line coverage, `72.76%` branch coverage, `80.58%` function coverage across `src/`.
4. **Production Build (`npm run build`):** `vite build` transforms `160` modules cleanly.

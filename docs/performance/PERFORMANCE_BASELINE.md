# Performance Baseline — Frontend

**Project**: PT XYZ DocShield CMS (`frontend/`)  
**Date**: 2026-11-23  

---

## 1. Initial Production Bundle Baseline (`dist/assets/` — `480K` total before Part A)

| Asset Chunk | Raw Size | Gzipped |
| :--- | :--- | :--- |
| `vue-vendor-*.js` (`vue`, `vue-router`, `pinia`) | `105.30 kB` | `40.91 kB` |
| `http-vendor-*.js` (`axios`) | `59.03 kB` | `22.15 kB` |
| `index-*.js` (app shell + router + stores) | `48.94 kB` | `17.13 kB` |
| `index-*.css` (Tailwind + tokens) | `28.32 kB` | `5.60 kB` |
| `UserManagement-*.js` (lazy route) | `20.38 kB` | `5.85 kB` |
| `AuditLogs-*.js` (lazy route) | `13.91 kB` | `4.62 kB` |
| `Documents-*.js` (lazy route) | `12.05 kB` | `4.12 kB` |
| `KeyManagement-*.js` (lazy route) | `10.73 kB` | `3.97 kB` |
| `Decrypt-*.js` (lazy route) | `9.33 kB` | `3.75 kB` |
| `Encrypt-*.js` (lazy route) | `8.48 kB` | `3.31 kB` |

## 2. Measurement Limitations
- Core Web Vitals (`LCP`, `FCP`, `INP`, `CLS`) and Chrome DevTools / Lighthouse profiles were not executed in a live headless browser in this offline sandbox.

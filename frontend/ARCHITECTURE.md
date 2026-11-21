# Frontend Architecture & Engineering Guide

## 1. Aturan Ketergantungan Layer (Strict Dependency Direction)

```text
View / Component  ──▶  Service  ──▶  Repository  ──▶  HTTP Client (Axios)  ──▶  Backend API
                          │
                          ├──▶ Domain Utils / Crypto Helpers
                          └──▶ Pinia Store (State Only)
```

- **Views (`src/views/`) & Components (`src/components/`)**: Hanya menangani UI, state tampilan lokal (`loading`, modal, form), dan memanggil **Service**. Dilarang mengimpor `axios`, `fetch`, `httpClient`, atau `repositories`.
- **Services (`src/services/`)**: Menangani seluruh *business logic*, validasi input bisnis, orkestrasi multi-repository, dan pemetaan error bisnis. Dilarang melakukan HTTP request langsung atau mengimpor View/Component.
- **Repositories (`src/repositories/`)**: Satu-satunya layer yang berkomunikasi dengan backend melalui `BaseRepository` dan konstanta `API_ENDPOINTS` (`src/constants/endpoints.js`). Tidak boleh mengandung *business logic* atau bergantung pada Service/Store/UI.
- **Stores (`src/stores/`)**: Murni state management (`auth.js`, `toast.js`), tanpa pemanggilan API.

## 2. Observability & Security Rules
- Gunakan `logger` dari `src/utils/logger.js` untuk pencatatan terstruktur (otomatis menyensor `password`, `passphrase`, `private_key`, `token`, `plaintext`, `ciphertext`). Jangan gunakan `console.log` langsung.
- Jangan pernah menyimpan atau men-hardcode rahasia produksi di `src/`.
- Operasi `GET` di `BaseRepository` memiliki *request deduplication* in-flight dan *safe retry* 1x untuk error jaringan/`502`/`503`/`504`. Operasi mutasi (`POST`, `PUT`, `DELETE`, `/encrypt`, `/decrypt`) tidak di-retry otomatis.

## 3. Perintah Pengembangan & Quality Gates
- `npm run dev` — Jalankan Vite dev server (`:5173`).
- `npm run lint:arch` — Jalankan validator arsitektur, circular dependency, dan security hygiene.
- `npm test` — Jalankan seluruh unit test Repository, Service, dan Cryptography Reliability (`node --test`).
- `npm run build` — Build produksi (`dist/`, `sourcemap: false`).
- `npm run check` — Jalankan seluruh quality gate sekaligus (`lint:arch && test && build`).

## 4. Pull Request Checklist
- [ ] Tidak ada pemanggilan API langsung di View/Component/Store.
- [ ] Business logic baru berada di Service dan memiliki unit test dengan mocked Repository.
- [ ] Tidak ada `console.log` / `v-html` / secret hardcoded.
- [ ] `npm run check` lulus dengan 0 error.

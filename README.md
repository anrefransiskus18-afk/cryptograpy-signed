# Framework Keamanan Informasi Internal Berbasis Kriptografi Hybrid (AES-256-GCM & ECC NIST P-256)

Implementasi *full-stack* produksi dari tesis Magister Ilmu Komputer:
> **"Pengembangan Framework Keamanan Informasi Internal Berbasis Kriptografi Hybrid AES-256 dan ECC untuk Perlindungan Dokumen Digital pada PT XYZ"**

---

## 1. Teknologi yang Digunakan

- **Frontend**: Vue.js 3 (Composition API), Vite, Pinia (State Management), Vue Router, Axios, Tailwind CSS (`http://localhost:5173`)
- **Backend**: Python 3, Flask REST API, SQLAlchemy ORM, PyCryptodome (`AES-256-GCM`, `ECC NIST P-256`, `ECDH`, `HKDF-SHA256`, `ECDSA FIPS 186-3`), Argon2id (`argon2-cffi`), PyJWT (`http://localhost:8000`)
- **Database**: MySQL 8.0 (`hybrid_crypto_db`) dengan 9 tabel terintegrasi

---

## 2. Struktur Folder Project

```text
hybrid-crypto-framework/
├── backend/
│   ├── app/
│   │   ├── api/                # REST API Blueprints (auth, dashboard, users, keys, encryption, decryption, documents, audit)
│   │   ├── core/               # Konfigurasi, Argon2id + JWT Security, RBAC Permissions
│   │   ├── cryptography/       # Modul Kriptografi Terpisah (aes_engine, ecc_engine, key_derivation, container_format, hybrid_engine)
│   │   ├── models/             # 9 Model SQLAlchemy ORM (Role, User, UserRole, PublicKey, UserKey, Document, DocumentRecipient, EncryptionMetadata, AuditLog, AuthenticationLog)
│   │   ├── repositories/       # Sinkronisasi repositori kunci & database
│   │   ├── schemas/            # Validasi input request API
│   │   └── services/           # AuditService (Hash-Chained + ECDSA P-256) & CryptoEngine Facade
│   ├── storage/                # Penyimpanan kontainer biner .enc terenkripsi
│   ├── tests/                  # Automated Pytest Suite & Performance Benchmark Script
│   ├── .env.example
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── run.py
│   └── schema.sql              # DDL SQL Lengkap MySQL 8.0
├── frontend/
│   ├── src/
│   │   ├── components/         # ToastContainer, ConfirmModal, StatCard
│   │   ├── composables/        # useFormatters
│   │   ├── router/             # Vue Router (9 Modul Halaman)
│   │   ├── services/           # Axios API Client + JWT Interceptor
│   │   ├── stores/             # Pinia Stores (auth, toast)
│   │   └── views/              # Login, Dashboard, Encrypt, Decrypt, Documents, KeyManagement, UserManagement, AuditLogs, Profile, Settings
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── ARCHITECTURE_AND_DESIGN.md
│   ├── DATABASE_ERD_AND_SCHEMA.md
│   ├── CRYPTO_CONTAINER_SPEC.md
│   ├── API_REFERENCE.md
│   ├── BENCHMARK_AND_SECURITY_REPORT.md
│   └── benchmark_results.json
├── docker-compose.yml
└── start_all.sh
```

---

## 3. Cara Menjalankan Aplikasi Secara Lokal

### Opsi A: Menjalankan Langsung dengan Skrip Otomatis
```bash
cd /home/anrefranciscus/hybrid-crypto-framework
chmod +x start_all.sh
./start_all.sh
```
- **Frontend Web Portal**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:8000/api/v1` (dan `/api/...`)
- **OpenAPI 3.0 Spec**: `http://localhost:8000/api/openapi.json`

### Opsi B: Menjalankan Pengujian Otomatis (`pytest`) & Benchmark
```bash
cd /home/anrefranciscus/hybrid-crypto-framework/backend
/home/anrefranciscus/pt-xyz-security/.venv/bin/pytest -v
/home/anrefranciscus/pt-xyz-security/.venv/bin/python tests/run_performance_benchmarks.py
```

---

## 4. Akun Demo Default (RBAC)

| Username | Email Korporat | Role RBAC | Clearance | Password Login | Passphrase Kunci PKCS#8 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `admin.security` | `admin.security@corp.local` | `SECURITY_ADMIN` | Level 4 | `Admin@2026!` | `KeyPass@2026!` |
| `direktur.keuangan` | `direktur.keuangan@corp.local` | `EXECUTIVE` | Level 3 | `Admin@2026!` | `KeyPass@2026!` |
| `manajer.riset` | `manajer.riset@corp.local` | `MANAGER` | Level 2 | `Admin@2026!` | `KeyPass@2026!` |
| `staf.operasional` | `staf.operasional@corp.local` | `STAFF` | Level 1 | `Admin@2026!` | `KeyPass@2026!` |


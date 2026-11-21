# Dokumentasi Endpoint REST API
## PT XYZ Internal Information Security Framework

Seluruh endpoint melayani baik prefix standar `/api/...` maupun prefix versi `/api/v1/...` dengan autentikasi `Authorization: Bearer <JWT_TOKEN>`.

---

## 1. Modul Autentikasi (`backend/app/api/auth.py`)
| Method | Endpoint | Alias V1 | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | `/api/v1/login` | Verifikasi kredensial (Argon2id), catat `authentication_logs`, dan terbitkan JWT token. |
| `POST` | `/api/auth/logout` | `/api/v1/logout` | Cabut (`revoke`) JTI token JWT aktif dan catat event logout. |
| `GET` | `/api/auth/me` | `/api/v1/me` | Ambil profil pengguna aktif, clearance level, dan kunci publik ECC aktif. |
| `POST` | `/api/auth/change-password` | `/api/v1/change-password` | Ubah password pengguna dengan hash Argon2id baru. |

## 2. Modul Dashboard (`backend/app/api/dashboard.py`)
| Method | Endpoint | Alias V1 | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard` | `/api/v1/stats` | Ringkasan statistik sistem, total dokumen, status kunci, insiden tamper, dan 12 log audit terakhir. |

## 3. Modul Manajemen Pengguna & RBAC (`backend/app/api/users.py`)
| Method | Endpoint | Alias V1 | Otorisasi | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | `/api/v1/users` | Authenticated | Daftar seluruh personel beserta status kunci publik ECC P-256. |
| `POST` | `/api/users` | `/api/v1/users` | Admin (L4) | Tambah personel baru + generate pasangan kunci ECC P-256 otomatis. |
| `GET` | `/api/users/<id>` | `/api/v1/users/<id>` | Self / Admin | Detail pengguna dan riwayat rotasi kunci. |
| `PUT` | `/api/users/<id>` | `/api/v1/users/<id>` | Self / Admin | Edit data pengguna, ubah role/status aktif, atau reset kunci ECC. |
| `DELETE` | `/api/users/<id>` | `/api/v1/users/<id>` | Admin (L4) | Soft-delete pengguna dan cabut seluruh kunci publiknya. |
| `GET` | `/api/roles` | `/api/v1/roles` | Authenticated | Daftar jabatan RBAC dan Clearance Level (1..4). |

## 4. Modul Manajemen Kunci ECC P-256 (`backend/app/api/keys.py`)
| Method | Endpoint | Alias V1 | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/keys` | `/api/v1/keys` | Direktori kunci publik ECC NIST P-256 aktif seluruh pengguna. |
| `GET` | `/api/keys/me` | `/api/v1/keys/me` | Status kunci aktif dan riwayat rotasi kunci milik pengguna. |
| `GET` | `/api/keys/public/<user_id>` | `/api/v1/keys/public/<user_id>` | Ambil kunci publik ECC P-256 aktif milik pengguna tertentu. |
| `POST` | `/api/keys/generate` | `/api/v1/keys/generate` | Bangkitkan pasangan kunci ECC NIST P-256 baru (PKCS#8 Encrypted Private Key). |
| `POST` | `/api/keys/rotate` | `/api/v1/keys/rotate` | Rotasi pasangan kunci ECC P-256 dan cabut kunci lama. |
| `POST` | `/api/keys/verify` | `/api/v1/keys/verify` | Verifikasi matematis kepemilikan kunci privat PKCS#8 terhadap fingerprint kunci publik. |

## 5. Modul Enkripsi, Dekripsi & Repositori Dokumen (`encryption.py`, `decryption.py`, `documents.py`)
| Method | Endpoint | Alias V1 | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/documents/encrypt` | `/api/v1/encrypt` | Enkripsi dokumen hybrid (`AES-256-GCM + ECDH P-256 + HKDF-SHA256`), simpan `.enc`, dan kembalikan file/metadata. |
| `POST` | `/api/documents/decrypt` | `/api/v1/decrypt` | Dekripsi kontainer `.enc` & verifikasi Authentication Tag GCM 16-byte (HTTP 422 jika `TAMPER_DETECTED`). |
| `GET` | `/api/documents` | `/api/v1/documents` | Daftar dokumen terenkripsi sesuai hak akses pengirim/penerima/admin. |
| `GET` | `/api/documents/<id>` | `/api/v1/documents/<id>` | Detail metadata kriptografi dokumen (`Q_eph`, `IV`, `Auth Tag`, `SHA-256`, `AAD`). |
| `GET` | `/api/documents/<id>/download` | `/api/v1/documents/<id>/download` | Unduh kontainer biner `.enc` dari repositori server. |
| `DELETE` | `/api/documents/<id>` | `/api/v1/documents/<id>` | Soft-delete dokumen terenkripsi. |

## 6. Modul Audit Log & Benchmark (`backend/app/api/audit.py`)
| Method | Endpoint | Alias V1 | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/audit-logs` | `/api/v1/audit` | Daftar log audit berantai beserta verifikasi tanda tangan ECDSA P-256 server. |
| `GET` | `/api/auth-logs` | `/api/v1/auth-logs` | Daftar riwayat autentikasi login/logout. |
| `GET` | `/api/settings` | `/api/v1/settings` | Parameter konfigurasi kriptografi sistem. |
| `PUT` | `/api/settings` | `/api/v1/settings` | Perbarui konfigurasi sistem (Admin). |
| `GET` | `/api/benchmarks/latest` | `/api/v1/benchmarks/latest` | Ambil hasil pengujian performa & tamper detection terbaru. |
| `GET` | `/api/openapi.json` | — | Spesifikasi OpenAPI 3.0.3 JSON. |

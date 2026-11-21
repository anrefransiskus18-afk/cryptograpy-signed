# Laporan Pengujian Fungsional, Performa, dan Keamanan Kriptografi
## Implementasi Tesis Hybrid AES-256-GCM dan ECC NIST P-256 pada PT XYZ

---

## 1. Hasil Pengujian Fungsional & Integrasi Otomatis (`pytest`)

Seluruh skenario uji fungsional, RBAC, siklus hidup kunci ECC P-256, struktur biner `.enc`, dan deteksi manipulasi dieksekusi menggunakan `pytest`:

- `tests/test_api_workflow.py::test_full_api_workflow` — **PASSED**
- `tests/test_api_workflow.py::test_rbac_and_unauthorized_document_access` — **PASSED**
- `tests/test_crypto_engine.py::test_ecc_p256_key_generation_and_pkcs8` — **PASSED**
- `tests/test_crypto_engine.py::test_ecdh_and_hkdf_sha256_consistency` — **PASSED**
- `tests/test_crypto_engine.py::test_aes_256_gcm_and_entropy_avalanche` — **PASSED**
- `tests/test_crypto_engine.py::test_hybrid_encryption_container_offsets_and_decryption` — **PASSED**
- `tests/test_crypto_engine.py::test_standardized_aes_gcm_key_wrap_mode_hc02` — **PASSED**
- `tests/test_crypto_engine.py::test_all_tamper_detection_scenarios_and_wrong_keys` — **PASSED**

---

## 2. Hasil Pengujian Eksperimental Performa Kriptografi (`tests/run_performance_benchmarks.py`)

Pengujian dilakukan secara nyata menggunakan dokumen uji berukuran **1 MiB (`DOC-S`)**, **10 MiB (`DOC-M`)**, dan **100 MiB (`DOC-L`)**:

| Kode Sampel | Ukuran Dokumen Asli | Ukuran Kontainer `.enc` | Overhead Biner | Rata-Rata Enkripsi (ms) | Rata-Rata Dekripsi (ms) | Throughput Enkripsi | Throughput Dekripsi | Peak RAM | Entropi Shannon Ciphertext | Avalanche Effect |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **DOC-S** | 1 MiB (1.048.576 B) | 1.048.705 B | **+129 B** (0,0123%) | **14,153 ms** | **11,261 ms** | **70,66 MiB/s** | **88,80 MiB/s** | 3,00 MiB | **7,999832 bits/B** | **49,9949%** |
| **DOC-M** | 10 MiB (10.485.760 B) | 10.485.889 B | **+129 B** (0,0012%) | **66,502 ms** | **66,221 ms** | **150,37 MiB/s** | **151,01 MiB/s** | 40,00 MiB | **7,999839 bits/B** | **49,9741%** |
| **DOC-L** | 100 MiB (104.857.600 B) | 104.857.729 B | **+129 B** (0,0001%) | **992,835 ms** | **957,442 ms** | **100,72 MiB/s** | **104,44 MiB/s** | 400,02 MiB | **7,999857 bits/B** | **49,9063%** |

- **Rata-rata Pembangkitan Pasangan Kunci ECC NIST P-256 + Ekspor PKCS#8**: ~450 ms (termasuk iterasi proteksi `PBKDF2WithHMAC-SHA256AndAES256-CBC`).
- **Kualitas Keacakan Ciphertext (Shannon Entropy)**: Mencapai **7,9998 bits/byte** (sangat mendekati batas teoretis sempurna 8,0000 bits/byte).
- **Efek Longsoran (*Avalanche Effect*)**: Mencapai rata-rata **49,96%** (sangat mendekati nilai ideal kriteria difusi 50,00%).

---

## 3. Hasil Pengujian 12 Skenario Deteksi Manipulasi (*Tamper Detection*)

| No | Skenario Manipulasi / Serangan Integritas | Target Komponen | Hasil Aktual | Status |
| :---: | :--- | :--- | :--- | :---: |
| **S1** | Pembalikan 1-bit pada Magic Header (`b"HC01"`) | Header `[0..4)` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S2** | Penggantian Versi Kontainer (`b"HC99"`) | Header `[0..4)` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S3** | Korupsi Byte Prefix Titik Kurva (`0x04 -> 0x02`) | `Q_eph [4]` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S4** | Pembalikan 1-bit Koordinat X Titik Ephemeral | `Q_eph [20]` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S5** | Pembalikan 1-bit Kunci Sesi Terenkapsulasi | `C_key [75]` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S6** | Pengosongan (*Zero-out*) Kunci Sesi `C_key` | `C_key [69..101)` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S7** | Pembalikan 1-bit pada IV / Nonce AES-GCM | `IV_GCM [105]` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S8** | Pembalikan 1-bit pada Authentication Tag GCM | `Auth_Tag [120]` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S9** | Pembalikan 1-bit pada Byte Pertama Ciphertext | `Ciphertext [129]` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S10** | Pembalikan 1-bit pada Byte Terakhir Ciphertext | `Ciphertext [-1]` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S11** | Manipulasi Metadata Klasifikasi AAD JSON | `Bound_AAD` | `TamperDetectedError` | **TERDETEKSI (100%)** |
| **S12** | Percobaan Dekripsi dengan Kunci Privat Pihak Ketiga | `d_rec` (Unauthorized) | `TamperDetectedError` | **TERDETEKSI (100%)** |

**Tingkat Deteksi Manipulasi (*Tamper Detection Rate*)**: **12 / 12 Skenario (100,0%)** — Tidak ada satu byte pun plaintext yang bocor ketika autentikasi tag gagal.

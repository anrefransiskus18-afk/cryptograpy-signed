# Arsitektur Sistem & Pemodelan Ancaman Keamanan
## Pengembangan Framework Keamanan Informasi Internal Berbasis Kriptografi Hybrid AES-256 dan ECC untuk Perlindungan Dokumen Digital pada PT XYZ

---

## 1. Arsitektur 5 Lapisan Pertahanan (*5-Layer Defense-in-Depth*)

Framework ini mengimplementasikan arsitektur pertahanan berlapis (*Defense-in-Depth*) sesuai Bab III dan Bab IV Tesis serta standar **ISO/IEC 27001:2022 Klausul A.8.24 (Use of Cryptography)** dan **NIST SP 800-56A / SP 800-38D**:

```mermaid
flowchart TD
    subgraph L1["Layer 1 — Authentication & Role-Based Access Control (RBAC)"]
        A1["Login Korporat (Username / Email / NIK)"]
        A2["Argon2id Password Hashing (m=65536 KiB, t=2, p=4)"]
        A3["Stateless JWT (HS256 + JTI Revocation) & Clearance Level (L1..L4)"]
    end

    subgraph L2["Layer 2 — Asymmetric Key Management (ECC NIST P-256)"]
        B1["Kurva Eliptik NIST P-256 (secp256r1 / prime256v1)"]
        B2["Public Key Directory (PEM + SHA-256 Fingerprint di MySQL)"]
        B3["Private Key At-Rest Protection (PKCS#8 PBKDF2-HMAC-SHA256-AES256-CBC)"]
    end

    subgraph L3["Layer 3 — Hybrid Cryptographic Engine"]
        C1["CSPRNG 256-Bit Ephemeral AES Session Key per Dokumen"]
        C2["Ephemeral-Static ECDH Key Agreement (Z = d_eph · Q_rec)"]
        C3["Key Derivation Function HKDF-SHA256 (RFC 5869)"]
        C4["Authenticated Encryption AES-256-GCM (96-bit Nonce, 128-bit Tag)"]
    end

    subgraph L4["Layer 4 — Binary Container Storage (.enc)"]
        D1["Struktur Kontainer Biner Sekuensial HC01 (129-Byte Fixed Prefix)"]
        D2["Cryptographic AAD Binding (Header || Q_eph || C_key || JSON Metadata)"]
    end

    subgraph L5["Layer 5 — Tamper-Proof Cryptographic Audit Trail"]
        E1["Hash-Chained Audit Log (prev_log_hash SHA-256)"]
        E2["Pseudonimisasi Identitas Dokumen (SHA-256 Filename Hash)"]
        E3["Digital Signature Server ECDSA P-256 (FIPS 186-3)"]
    end

    L1 --> L2 --> L3 --> L4 --> L5
```

---

## 2. Alur Proses Enkripsi Hybrid (AES-256-GCM + ECDH + HKDF-SHA256)

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Pengirim (Authenticated)
    participant UI as Vue.js 3 Frontend
    participant API as Flask REST API
    participant Engine as HybridCryptoEngine (PyCryptodome)
    participant DB as MySQL 8.0 & AuditService

    Sender->>UI: Pilih Dokumen + Penerima + Klasifikasi AAD JSON
    UI->>API: POST /api/documents/encrypt (multipart/form-data)
    API->>DB: Ambil Public Key ECC P-256 Aktif Penerima (Q_rec)
    API->>Engine: encrypt_document_with_metrics(Plaintext, Q_rec, AAD)
    Engine->>Engine: 1. Generate Ephemeral ECC Keypair (d_eph, Q_eph 65B)
    Engine->>Engine: 2. Generate CSPRNG Session Key K_AES (32B) & Nonce IV (12B)
    Engine->>Engine: 3. Hitung Shared Secret ECDH: Z = d_eph × Q_rec (32B)
    Engine->>Engine: 4. Turunkan K_wrap = HKDF-SHA256(IKM=Z, Salt=SHA256(Q_eph))
    Engine->>Engine: 5. Bungkus Kunci Sesi: C_key (32B HC01 / 48B HC02)
    Engine->>Engine: 6. Bentuk Bound AAD = Header || Q_eph || C_key || Canonical_JSON(AAD)
    Engine->>Engine: 7. Enkripsi AES-256-GCM(Plaintext, K_AES, IV, Bound_AAD) -> Ciphertext, Tag (16B)
    Engine->>Engine: 8. Rakit Kontainer .enc & Hapus K_AES, d_eph, Z dari RAM
    API->>DB: Simpan Metadata Dokumen & Rekam Audit Log (Signed ECDSA P-256)
    API-->>UI: Kembalikan Kontainer Biner .enc + Header Metrik
```

---

## 3. Alur Proses Dekripsi & Deteksi Manipulasi (*1-Bit Tamper Detection*)

```mermaid
sequenceDiagram
    autonumber
    actor Recipient as Penerima Sah
    participant UI as Vue.js 3 Frontend
    participant API as Flask REST API
    participant Engine as HybridCryptoEngine (PyCryptodome)
    participant DB as MySQL 8.0 & AuditService

    Recipient->>UI: Unggah/Pilih .enc + Kunci Privat PKCS#8 + Passphrase + AAD
    UI->>API: POST /api/documents/decrypt
    API->>Engine: decrypt_container(Container, Encrypted_PrivKey, Passphrase, AAD)
    Engine->>Engine: 1. Validasi Magic Header ("HC01"/"HC02") & Unpack Offset Biner
    Engine->>Engine: 2. Buka Kunci Privat PKCS#8 di RAM dengan Passphrase (d_rec)
    Engine->>Engine: 3. Validasi Titik Kurva Q_eph (65B SEC1) berada di kurva NIST P-256
    Engine->>Engine: 4. Hitung Shared Secret ECDH: Z = d_rec × Q_eph (32B)
    Engine->>Engine: 5. Turunkan K_wrap = HKDF-SHA256(IKM=Z, Salt=SHA256(Q_eph)) & Buka K_AES
    Engine->>Engine: 6. Bentuk Bound AAD = Header || Q_eph || C_key || Canonical_JSON(AAD)
    Engine->>Engine: 7. Verifikasi Tag GCM (decrypt_and_verify)
    alt Tag GCM Valid (Integritas 100% Utuh)
        Engine-->>API: Kembalikan Plaintext & Zeroize K_AES, d_rec dari RAM
        API->>DB: Catat Audit Log DECRYPTION_SUCCESS (Signed ECDSA)
        API-->>UI: Unduh Dokumen Asli Terpulihkan
    else Tag GCM Gagal / Kunci Salah / Manipulasi >= 1-Bit
        Engine-->>API: Raise TamperDetectedError (Tanpa Mengeluarkan Plaintext)
        API->>DB: Catat Insiden Kritis TAMPER_DETECTED (Signed ECDSA)
        API-->>UI: HTTP 422 Unprocessable Entity (Alert Keamanan Merah)
    end
```

---

## 4. Analisis Risiko Keamanan & Mitigasi Teknis

| ID | Ancaman / Risiko Keamanan | Dampak | Mitigasi Teknis yang Diimplementasikan |
| :--- | :--- | :--- | :--- |
| **R-01** | *Brute-Force* & *Credential Stuffing* pada Kredensial Login | Pengambilalihan akun pengguna | Hashing password menggunakan **Argon2id** (`m=65536 KiB, t=2, p=4`, salt acak 16-byte) disertai *sliding-window rate limiting* dan pencatatan di `authentication_logs`. |
| **R-02** | Kebocoran Kunci Privat ECC P-256 (*Private Key Compromise*) | Dekripsi tidak sah atas dokumen rahasia | Kunci privat tidak pernah disimpan dalam bentuk plaintext; wajib dienkripsi dengan standar **PKCS#8 (`PBKDF2WithHMAC-SHA256AndAES256-CBC`)** menggunakan passphrase pengguna. |
| **R-03** | Kompromi Kunci Sesi Masa Lalu (*Lack of Forward Secrecy*) | Seluruh dokumen ikut terbuka jika 1 kunci sesi bocor | Setiap enkripsi dokumen membangkitkan kunci sesi AES-256 baru (32-byte CSPRNG) dan pasangan kunci **Ephemeral ECC P-256 (`d_eph, Q_eph`)** sekali pakai. |
| **R-04** | *Nonce / IV Reuse* pada Mode AES-256-GCM | Kehancuran autentikasi GHASH dan kebocoran keystream | Setiap enkripsi menggunakan kombinasi kunci sesi sekali pakai dan fungsi `AESEngine.generate_unique_nonce(session_key)` berbasis CSPRNG 96-bit dengan deteksi kolisi per-kunci. |
| **R-05** | Manipulasi Ciphertext, Header `.enc`, atau Metadata Klasifikasi (*Bit-Flipping Attack*) | Pemalsuan isi dokumen atau penurunan level klasifikasi | Seluruh prefix biner (`Magic_Header || Q_eph || C_key`) serta JSON AAD kanonik diikat ke dalam **Additional Authenticated Data (AAD)** pada **AES-256-GCM**. Modifikasi 1-bit langsung menggagalkan `decrypt_and_verify` sebelum plaintext dikeluarkan. |
| **R-06** | *Broken Access Control* / *Insecure Direct Object Reference (IDOR)* | Staf mengakses dokumen milik pengguna lain | Pemeriksaan otorisasi berlapis di backend (`app/core/permissions.py` dan `app/api/documents.py`) yang memverifikasi pengirim, tabel `document_recipients`, serta kepemilikan kunci privat kriptografis. |
| **R-07** | Penghapusan atau Pemalsuan Jejak Audit (*Audit Log Tampering*) | Penyerang menghilangkan bukti insiden | Setiap baris `audit_logs` menyertakan rantai hash `prev_log_hash` (`SHA-256`) dan ditandatangani dengan **ECDSA NIST P-256 (FIPS 186-3)** menggunakan kunci privat server. |

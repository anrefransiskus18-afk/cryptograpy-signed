# Spesifikasi Kontainer Biner `.enc` & Proses Kriptografi Hybrid

---

## 1. Struktur Kontainer Biner `.enc` (Tabel 3.10 Tesis — Prefix 129-Byte `HC01`)

Setiap dokumen yang dienkripsi dikemas menjadi kontainer biner `.enc` dengan tata letak byte sekuensial berikut:

```
+-----------------------------------------------------------------------+
|                       KONTAINER BINER .enc (HC01)                     |
+-----------------------+---------------+-------------------------------+
| Offset Byte           | Ukuran        | Nama Field & Deskripsi        |
+-----------------------+---------------+-------------------------------+
| [0 .. 4)              | 4 Byte        | Magic Header: b"HC01"         |
| [4 .. 69)             | 65 Byte       | Q_eph: Titik Publik Ephemeral |
|                       |               | ECC NIST P-256 Uncompressed   |
|                       |               | SEC1 (0x04 || X_32B || Y_32B) |
| [69 .. 101)           | 32 Byte       | C_key: Kunci Sesi AES-256     |
|                       |               | Terenkapsulasi (K_AES ^ K_w)  |
| [101 .. 113)          | 12 Byte       | IV_GCM: Nonce 96-bit CSPRNG   |
| [113 .. 129)          | 16 Byte       | Auth_Tag: Tag Integritas GCM  |
|                       |               | 128-bit (MAC GHASH)           |
+-----------------------+---------------+-------------------------------+
| [129 .. 129 + N)      | N Byte        | Ciphertext Payload            |
+-----------------------+---------------+-------------------------------+
Total Ukuran File .enc = N + 129 Byte (Overhead Konstan 129 Byte)
```

### Mode Opsional `HC02` (Authenticated AES-256-GCM Key Wrap — Prefix 145-Byte)
Selain mode baseline tesis `HC01` (`XOR_AAD`), mesin kriptografi juga menyediakan mode `HC02` (`AES_GCM_KW`) di mana `C_key` berukuran **48 Byte** (`Nonce_KW [12B] || Wrapped_Key [32B] || Tag_KW [16B]` atau `Wrapped_Key [32B] || Tag_KW [16B]` dengan deterministic HKDF IV), menghasilkan total prefix **145 Byte**.

---

## 2. Formulasi Matematis Pertukaran Kunci & Enkapsulasi

1. **Pembangkitan Kunci Ephemeral Pengirim**:
   $$d_{\text{eph}} \xleftarrow{\$} [1, n-1], \quad Q_{\text{eph}} = d_{\text{eph}} \cdot G \in E(\mathbb{F}_p)$$
2. **Kesepakatan Kunci Ephemeral-Static ECDH (NIST SP 800-56A)**:
   $$Z = \text{ECDH}(d_{\text{eph}}, Q_{\text{rec}}) = (x_Z, y_Z) \implies \text{IKM} = x_Z \text{ (32 Byte)}$$
3. **Derivasi Kunci Pembungkus via HKDF-SHA256 (RFC 5869)**:
   $$\text{Salt} = \text{SHA-256}(Q_{\text{eph}}), \quad K_{\text{wrap}} = \text{HKDF-SHA256}(\text{IKM}=x_Z, \text{len}=32, \text{salt}=\text{Salt}, \text{info}=\text{"HYBRID-ECC-P256-AES256-GCM-KEYWRAP-V1"})$$
4. **Pengikatan Additional Authenticated Data (AAD) ke Polinomial GHASH**:
   $$\text{Bound\_AAD} = \text{Header}_{4\text{B}} \parallel Q_{\text{eph}, 65\text{B}} \parallel C_{\text{key}} \parallel \text{Canonical\_JSON}(\text{AAD})$$
   $$(C, T_{16\text{B}}) = \text{AES-256-GCM-Encrypt}(K_{\text{AES}}, \text{IV}_{12\text{B}}, P, \text{Bound\_AAD})$$

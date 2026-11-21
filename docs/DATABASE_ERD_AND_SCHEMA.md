# Desain Database Relasional (MySQL 8.0) & Entity-Relationship Diagram (ERD)

---

## 1. Entity-Relationship Diagram (ERD)

Skema database mengintegrasikan struktur tabel utama pada Bab III Tesis (`roles`, `users`, `public_keys`, `audit_logs`) dengan tabel operasional manajemen dokumen dan siklus hidup kunci (`user_roles`, `user_keys`, `documents`, `document_recipients`, `encryption_metadata`, `authentication_logs`):

```mermaid
erDiagram
    ROLES ||--o{ USERS : "primary role_id"
    USERS ||--o{ USER_ROLES : "has"
    ROLES ||--o{ USER_ROLES : "assigned to"
    USERS ||--o{ PUBLIC_KEYS : "publishes (Thesis Table 3.4)"
    USERS ||--o{ USER_KEYS : "manages keypair vault"
    USERS ||--o{ DOCUMENTS : "encrypts as sender"
    DOCUMENTS ||--o{ DOCUMENT_RECIPIENTS : "authorized for"
    USERS ||--o{ DOCUMENT_RECIPIENTS : "receives"
    DOCUMENTS ||--|| ENCRYPTION_METADATA : "contains crypto params"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    DOCUMENTS ||--o{ AUDIT_LOGS : "referenced in"
    USERS ||--o{ AUTHENTICATION_LOGS : "authenticates"

    ROLES {
        int id PK
        varchar name UK "STAFF, MANAGER, EXECUTIVE, SECURITY_ADMIN"
        int clearance_level "1..4"
        varchar description
    }

    USERS {
        int id PK
        varchar nik UK "Nomor Induk Karyawan"
        varchar username UK
        varchar email UK
        varchar full_name
        varchar department
        varchar password_hash "Argon2id Hash"
        int role_id FK
        boolean is_active
        datetime created_at
        datetime updated_at
        datetime deleted_at "Soft Delete"
    }

    PUBLIC_KEYS {
        int id PK
        int user_id FK
        char key_fingerprint UK "SHA-256 (64 hex chars)"
        text public_key_pem "SubjectPublicKeyInfo PEM"
        varchar curve_name "NIST P-256"
        boolean is_revoked
        datetime created_at
    }

    USER_KEYS {
        int id PK
        int user_id FK
        char key_fingerprint UK "SHA-256 (64 hex chars)"
        text public_key_pem
        text encrypted_private_key_pem "PKCS#8 Encrypted PEM"
        varchar kdf_protection "PBKDF2WithHMAC-SHA256AndAES256-CBC"
        varchar curve_name "NIST P-256"
        varchar status "ACTIVE, ROTATED, REVOKED"
        boolean is_revoked
        datetime created_at
        datetime rotated_at
    }

    DOCUMENTS {
        int id PK
        varchar doc_uid UK "DOC-YYYYMMDD-XXXXXX"
        varchar original_filename
        varchar encrypted_filename
        varchar file_extension
        varchar mime_type
        varchar storage_path
        bigint original_size_bytes
        bigint encrypted_size_bytes
        int overhead_bytes "129 B (HC01) / 145 B (HC02)"
        char sha256_plaintext_hash "64 hex chars"
        char sha256_ciphertext_hash "64 hex chars"
        int sender_id FK
        varchar classification "INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET"
        varchar status "ENCRYPTED, REVOKED, DELETED"
        boolean is_deleted
        datetime created_at
    }

    DOCUMENT_RECIPIENTS {
        int id PK
        int document_id FK
        int recipient_user_id FK
        int recipient_key_id FK
        char recipient_key_fingerprint
        varchar access_status "GRANTED, REVOKED"
        int decrypted_count
        datetime last_decrypted_at
    }

    ENCRYPTION_METADATA {
        int id PK
        int document_id FK
        char container_version "HC01 / HC02"
        varchar key_wrap_mode "XOR_AAD / AES_GCM_KW"
        varchar curve_name "NIST P-256"
        varchar kdf_algorithm "HKDF-SHA256"
        varchar ephemeral_public_point_hex "130 hex chars (65B SEC1)"
        varchar wrapped_key_hex "64 or 96 hex chars"
        char iv_gcm_hex "24 hex chars (12B)"
        char auth_tag_gcm_hex "32 hex chars (16B)"
        json aad_json "Authenticated Metadata"
        float shannon_entropy
        float encryption_duration_ms
    }

    AUDIT_LOGS {
        int id PK
        datetime timestamp
        int user_id FK
        varchar actor_identity
        varchar action_type
        varchar status "SUCCESS, FAILED, CRITICAL"
        int document_id FK
        char document_hash "SHA-256 Pseudonymized"
        varchar ip_address
        json metadata_json
        char prev_log_hash "SHA-256 Chain"
        text server_signature "ECDSA P-256 Base64 Signature"
    }

    AUTHENTICATION_LOGS {
        int id PK
        datetime timestamp
        int user_id FK
        varchar username_attempted
        varchar event_type "LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT"
        varchar status
        varchar ip_address
        varchar user_agent
        varchar failure_reason
    }
```

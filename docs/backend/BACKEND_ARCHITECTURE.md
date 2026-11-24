# Backend Architecture

## 1. Technology Stack
- **Framework**: Python + **Flask `3.1.0`** (`Flask-CORS 5.0.0`) served via **Gunicorn `23.0.0`** (`backend/wsgi.py`)
- **ORM & Database**: **SQLAlchemy `2.0.38`** + **PyMySQL `1.1.1`** (MySQL 8.0 in Docker; SQLite fallback in local dev/tests)
- **Cryptography**: **PyCryptodome `3.21.0`** (`AES`, `SHA256`, `HMAC`, `PBKDF2`, `get_random_bytes`) + **`cryptography >= 44.0.0`** (`Argon2id`, ECC NIST P-256)

## 2. Layered Structure (`backend/app/`)
- `api/` — Flask Blueprints (`auth_bp`, `dashboard_bp`, `users_bp`, `keys_bp`, `encryption_bp`, `decryption_bp`, `documents_bp`, `audit_bp`)
- `middleware/` — Authentication & RBAC decorators (`auth.py`: `@jwt_required`)
- `dto/` — Request/response schemas (`auth_dto.py`, `user_dto.py`, `key_dto.py`, `document_dto.py`, `audit_dto.py`) + `lib/lazy.py` serializer
- `services/` — Application & cryptographic services (`CryptoEngine.py`, `AuditService.py`)
- `cryptography/` — Modular crypto primitives (`aes_engine.py`, `ecc_engine.py`, `key_derivation.py`, `hybrid_engine.py`, `container_format.py`)
- `repositories/` — Data access repositories (`KeyRepository`, etc.)
- `core/` — Configuration (`config.py`), permissions (`permissions.py`), and security primitives (`security.py`)
- `models.py` & `schema.sql` — 10 relational SQLAlchemy models (`Role`, `User`, `UserRole`, `PublicKey`, `UserKey`, `Document`, `DocumentRecipient`, `EncryptionMetadata`, `AuditLog`, `AuthenticationLog`)

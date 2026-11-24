# Database Engineering Report

## 1. Schema & Relational Integrity (`backend/schema.sql` & `models.py`)
- **Primary Engine**: MySQL 8.0 (`utf8mb4` / `utf8mb4_unicode_ci`), initialized via `schema.sql` and `Base.metadata.create_all()`.
- **Core Tables**: `roles`, `users`, `user_roles`, `public_keys`, `user_keys`, `documents`, `document_recipients`, `encryption_metadata`, `audit_logs`, `authentication_logs`.
- **Safe Additive Evolution (`_ensure_schema_columns`)**: Non-destructively ensures `users.{nik,deleted_at,updated_at,password_changed_at}` and `audit_logs.{status,document_id}` exist on pre-existing databases.
- **Soft Delete**: `users` supports `deleted_at` soft-deletion to preserve audit-log and document provenance foreign keys.

## 2. Observed Operational Risks
- `database.py` session lifecycle relies on explicit `db.close()` in `try/finally` blocks inside route handlers.
- Audit chain verification (`verify_audit_chain`) batches `500` rows per query (`order_by(AuditLog.id.asc())`) to bound memory consumption on large tables.

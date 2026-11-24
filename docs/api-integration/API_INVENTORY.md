# API Inventory

All endpoints discovered directly from `backend/app/api/*.py`, `backend/app/__init__.py`, and `frontend/src/constants/endpoints.ts`.
Frontend `httpClient` resolves `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1` in dev, `/api/v1` in Docker production).

## 1. Authentication & Profile (`auth_bp`)
| Frontend Constant | Method | Canonical `/api/v1` Path | Legacy Alias | Auth |
| :--- | :--- | :--- | :--- | :--- |
| `AUTH.LOGIN` | `POST` | `/api/v1/login` | `/api/auth/login` | Public |
| `AUTH.LOGOUT` | `POST` | `/api/v1/logout` | `/api/auth/logout` | JWT |
| `AUTH.ME` | `GET` | `/api/v1/me` | `/api/auth/me` | JWT |
| `AUTH.ME` | `PUT` | `/api/v1/me` | `/api/auth/me` | JWT |
| `AUTH.CHANGE_PASSWORD` | `POST` | `/api/v1/change-password` | `/api/auth/change-password` | JWT |

## 2. Cryptography & Documents (`encryption_bp`, `decryption_bp`, `documents_bp`)
| Frontend Constant | Method | Canonical `/api/v1` Path | Legacy Alias | Payload / Response |
| :--- | :--- | :--- | :--- | :--- |
| `CRYPTO.ENCRYPT` | `POST` | `/api/v1/encrypt` | `/api/documents/encrypt` | Multipart `FormData` → `Blob` + telemetry headers |
| `CRYPTO.DECRYPT` | `POST` | `/api/v1/decrypt` | `/api/documents/decrypt` | Multipart `FormData` → `Blob` + `X-GCM-Auth-Status` |
| `DOCUMENTS.BASE` | `GET` | `/api/v1/documents` | `/api/documents` | `DocumentListResponseDTO` |
| `DOCUMENTS.BY_ID(id)` | `GET` | `/api/v1/documents/<id>` | `/api/documents/<id>` | `DocumentResponseDTO` |
| `DOCUMENTS.DOWNLOAD(id)` | `GET` | `/api/v1/documents/<id>/download` | `/api/documents/<id>/download` | Binary `.enc` `Blob` |
| `DOCUMENTS.BY_ID(id)` | `DELETE` | `/api/v1/documents/<id>` | `/api/documents/<id>` | `MessageResponse` |

## 3. ECC Keys (`keys_bp`)
| Frontend Constant | Method | Canonical `/api/v1` Path | Legacy Alias |
| :--- | :--- | :--- | :--- |
| `KEYS.LIST` | `GET` | `/api/v1/keys` | `/api/keys` |
| `KEYS.ME` | `GET` | `/api/v1/keys/me` | `/api/keys/me` |
| — (backend only) | `GET` | `/api/v1/keys/public/<user_id>` | `/api/keys/public/<user_id>` |
| `KEYS.GENERATE` | `POST` | `/api/v1/keys/generate` | `/api/keys/generate` |
| `KEYS.ROTATE` | `POST` | `/api/v1/keys/rotate` | `/api/keys/rotate` |
| `KEYS.VERIFY` | `POST` | `/api/v1/keys/verify` | `/api/keys/verify` |

## 4. Users, Audit, Dashboard, Settings & Ops (`users_bp`, `audit_bp`, `dashboard_bp`, `app`)
| Frontend Constant | Method | Canonical `/api/v1` Path | Legacy Alias |
| :--- | :--- | :--- | :--- |
| `USERS.BASE` | `GET` / `POST` | `/api/v1/users` | `/api/users` |
| `USERS.BY_ID(id)` | `GET` / `PUT` / `DELETE` | `/api/v1/users/<id>` | `/api/users/<id>` |
| — (backend only) | `GET` | `/api/v1/roles` | `/api/roles` |
| `AUDIT.LOGS` | `GET` | `/api/v1/audit` | `/api/audit-logs` |
| `AUDIT.AUTH_LOGS` | `GET` | `/api/v1/auth-logs` | `/api/auth-logs` |
| `AUDIT.VERIFY_CHAIN` | `GET` | `/api/v1/audit/verify-chain` | `/api/audit-logs/verify-chain`, `/api/v1/audit-logs/verify-chain` |
| `DASHBOARD.STATS` | `GET` | `/api/v1/stats` | `/api/dashboard` |
| `SETTINGS.BASE` | `GET` / `PUT` | `/api/v1/settings` | `/api/settings` |
| `SETTINGS.BENCHMARKS` | `GET` | `/api/v1/benchmarks/latest` | `/api/benchmarks/latest` |
| — | `GET` | `/api/v1/health` | `/health`, `/api/health` |
| — | `GET` | `/api/v1/metrics` | `/metrics` |
| — | `GET` | `/api/openapi.json` | — |

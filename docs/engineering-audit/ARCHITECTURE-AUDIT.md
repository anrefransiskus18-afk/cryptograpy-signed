# Architecture Audit — PT XYZ Hybrid Cryptography Framework

**Audit Date:** 2026-11-21  
**Scope:** Full-stack (`frontend/` Vue 3 + Vite + Pinia, `backend/` Flask + SQLAlchemy)

---

## 1. Repository & Layer Inventory (Observed)

### Frontend (`frontend/src/`)
- **API & Interceptors (`src/api/`)**: `httpClient.js` (Axios instance, `DEFAULT_TIMEOUT_MS = 30000`, `LONG_OPERATION_TIMEOUT_MS = 300000`), `interceptors.js` (Bearer JWT injection, `X-Correlation-ID` generation, `Lazy.transform`, latency logging, 401 session reset).
- **Constants & Config (`src/constants/`, `src/config/`)**: `endpoints.js` (`API_ENDPOINTS`), `demo.js` (`DEMO_MODE` environment gating).
- **DTO & Transformation (`src/dto/`, `src/lib/`)**: `auth.dto.js`, `audit.dto.js`, `document.dto.js`, `key.dto.js`, `user.dto.js`, `index.js`, `lazy.js` (`Lazy.transform`).
- **Repositories (`src/repositories/`)**: `BaseRepository.js`, `AuthRepository.js`, `CryptoRepository.js`, `DocumentRepository.js`, `KeyRepository.js`, `UserRepository.js`, `AuditRepository.js`, `DashboardRepository.js`, `SettingsRepository.js`, `index.js`.
- **Services (`src/services/`)**: `AuthService.js`, `CryptoService.js`, `EncryptionService.js`, `DecryptionService.js`, `DocumentService.js`, `KeyService.js`, `UserService.js`, `AuditService.js`, `DashboardService.js`, `SettingsService.js`, `index.js`.
- **Stores (`src/stores/`)**: `auth.js` (`useAuthStore`), `toast.js` (`useToastStore`).
- **Composables & Utilities (`src/composables/`, `src/utils/`)**: `useFormatters.js`, `errors.js`, `file.js`, `logger.js`, `crypto/tamperSimulator.js`.
- **UI Components & Views (`src/components/`, `src/views/`, `src/router/`)**: 14 reusable components (`AlertBanner.vue`, `BaseModal.vue`, `ConfirmModal.vue`, `CopyButton.vue`, `DataTableCard.vue`, `FileDropzone.vue`, `MonoCopyBox.vue`, `PageHeader.vue`, `PaginationBar.vue`, `PasswordInput.vue`, `ProgressBar.vue`, `StatCard.vue`, `StatusBadge.vue`, `ToastContainer.vue`), 10 lazy-loaded views, `App.vue`, `router/index.js`.

### Backend (`backend/app/`)
- **App Factory & Persistence (`app/__init__.py`, `app/database.py`, `app/models.py`)**: Flask app factory, SQLAlchemy ORM (MySQL/PyMySQL primary, SQLite fallback).
- **Core (`app/core/`)**: `config.py`, `security.py`, `permissions.py`.
- **Cryptography (`app/cryptography/`)**: `aes_engine.py`, `ecc_engine.py`, `key_derivation.py`, `container_format.py`, `hybrid_engine.py`.
- **API Blueprints (`app/api/`)**: `auth.py`, `encryption.py`, `decryption.py`, `documents.py`, `keys.py`, `users.py`, `audit.py`, `dashboard.py`.
- **Repositories, Services, DTOs, Schemas**: `repositories/__init__.py` (`KeyRepository`), `services/AuditService.py`, `services/CryptoEngine.py`, `dto/*`, `schemas/__init__.py`.

---

## 2. Boundary & Pattern Verification

| Layer | Expected Responsibility | Observed Compliance |
|---|---|---|
| **Repository (`src/repositories/`)** | HTTP transport only; centralized endpoints; no business workflows or UI/Store imports. | **Compliant.** Automated check (`scripts/check-architecture.mjs`) verified 66 files with 0 layer violations and 0 circular dependencies. |
| **Service (`src/services/`)** | Business validation, orchestration, DTO/file/crypto workflows; independent of Vue lifecycle. | **Compliant.** Services delegate HTTP to repositories and accept injected dependencies for unit testing. |
| **Component / View (`src/views/`, `src/components/`)** | UI state, rendering, user events; no direct `axios`/`fetch`/`repositories` imports. | **Compliant.** Verified by `lint:arch`. |
| **Store (`src/stores/`)** | Reactive session & toast state only; no HTTP calls or heavy business logic. | **Compliant.** |

---

## 3. Architectural Findings & Remediations

### FINDING-ARCH-01 (MEDIUM) — Duplicate User State in `App.vue`
- **Affected File:** `frontend/src/App.vue`
- **Technical Issue:** `App.vue` maintained a local `currentUser = ref(null)` synchronized manually via `refreshUserState()`, duplicating `authStore.user` and risking UI desynchronization.
- **Remediation Performed:** Replaced `currentUser` with `computed(() => authStore.user)` directly backed by Pinia store state.
- **Validation Evidence:** Verified via `npm run build` and `stores.test.js`.

### FINDING-ARCH-02 (MEDIUM) — Debounce Timer Lifecycle Cleanup
- **Affected Files:** `frontend/src/composables/useFormatters.js`, `frontend/src/views/AuditLogs.vue`
- **Technical Issue:** `debounce()` did not expose `.cancel()`, leaving pending search timers alive if a view unmounted before the 300ms delay elapsed.
- **Remediation Performed:** Added `debounced.cancel()` in `useFormatters.js` and invoked `debouncedLoadLogs.cancel?.()` in `onUnmounted` in `AuditLogs.vue`.
- **Validation Evidence:** Unit tested in `frontend/tests/crypto-reliability.test.js`.

### FINDING-ARCH-03 (LOW) — Backend Blueprint Organization
- **Affected Files:** `backend/app/api/*.py`
- **Technical Issue:** Several Flask route handlers directly query SQLAlchemy models instead of going through dedicated domain repositories (only `KeyRepository` and `AuditService` are extracted).
- **Status:** Documented as technical debt; preserved existing API behavior without unnecessary rewrite.

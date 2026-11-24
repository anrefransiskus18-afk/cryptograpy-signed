# Frontend Architecture — Hybrid Crypto Framework

## 1. Architectural Overview
The frontend is a **Vue 3 (`3.5.13`) + TypeScript (`6.0.3`) + Vite (`6.0.5`)** Single-Page Application structured around **Clean Architecture** and **Repository + Service + DTO** boundaries, enforced automatically by `scripts/check-architecture.mjs` (`npm run lint:arch`).

```text
Presentation Layer (views/, layouts/, components/)
        ↓
Application Layer (services/, composables/, stores/)
        ↓
Domain & Boundary Layer (dto/, types/, utils/, i18n/)
        ↓
Infrastructure Layer (api/, repositories/, workers/, config/)
```

## 2. Directory Ownership
- `src/views/` — Route-level pages (`Dashboard.vue`, `Encrypt.vue`, `Decrypt.vue`, `Documents.vue`, `KeyManagement.vue`, `AuditLogs.vue`, `UserManagement.vue`, `Profile.vue`, `Settings.vue`, `Login.vue`, `NotFound.vue`). Views orchestrate UI state and call `services/` and `composables/`. Views never call `httpClient` or `axios` directly.
- `src/layouts/MainLayout.vue` — Authenticated shell layout featuring a WCAG skip-to-content link (`#main-content`), responsive navigation drawer, breadcrumbs (`AppBreadcrumbs`), and route `<slot />`.
- `src/components/` — Reusable UI primitives (`BaseButton`, `BaseInput`, `BaseSelect`, `BaseModal`, `ConfirmModal`, `DataTableCard`, `FilterToolbar`, `PaginationBar`, `PasswordInput`, `FileDropzone`, `AlertBanner`, `StatusBadge`, `StatCard`, `PageHeader`, `ProgressBar`, `SkeletonLoader`, `MonoCopyBox`, `CopyButton`, `AppBreadcrumbs`, `ToastContainer`, `ErrorBoundary`) and domain subcomponents (`components/users/{UserCreateModal,UserEditModal}.vue`, `components/audit/AuditDetailModal.vue`, `components/keys/PublicKeyDirectoryTable.vue`).
- `src/services/` — Application use-cases and orchestration (`authService`, `documentService`, `keyService`, `userService`, `auditService`, `settingsService`). Validates client-side preconditions and transforms DTOs.
- `src/repositories/` — Data access abstraction extending `BaseRepository` (`authRepository`, `documentRepository`, `keyRepository`, `userRepository`, `auditRepository`, `settingsRepository`). Communicates exclusively with `src/api/httpClient.ts`.
- `src/api/` — Centralized Axios instance (`httpClient.ts`) and request/response interceptors (`interceptors.ts`) handling JWT bearer injection, `AbortSignal` propagation, 401 session invalidation, and `AppError` normalization.
- `src/dto/` — Request/response Data Transfer Objects (`auth.dto.ts`, `document.dto.ts`, `key.dto.ts`, `user.dto.ts`, `audit.dto.ts`, `apiError.dto.ts`) that narrow untrusted `Record<string, unknown>` payloads using runtime readers from `src/utils/validators.ts`.
- `src/stores/` — Modular Pinia stores (`auth.ts`, `toast.ts`).
- `src/composables/` — Focused Vue 3 composables (`useAsync`, `useDebounce`, `useFormatters`, `useCryptoStream`).
- `src/workers/` — Off-main-thread Web Worker (`hashWorker.ts`) with `correlationId` matching and `30s` timeout protection for SHA-256 hashing.
- `src/i18n/` — Typed localization engine (`id` default, `en` secondary).

## 3. Enforced Dependency Rules (`scripts/check-architecture.mjs`)
1. **No direct HTTP calls in UI**: `views/` and `components/` cannot import `axios` or `api/httpClient`.
2. **Strict layer direction**: `repositories/` cannot import `services/`, `stores/`, or `views/`; `services/` cannot import `views/` or `components/`.
3. **Acyclic module graph**: DFS cycle detection prevents circular imports across `src/`.
4. **Security invariants**: Disallows `eval`, `new Function`, `v-html`, `console.*` in production `src/`, and `Math.random()` in cryptographic paths.

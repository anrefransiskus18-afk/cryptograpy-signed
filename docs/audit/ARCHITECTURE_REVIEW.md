# Architecture Review — Frontend

**Project**: PT XYZ DocShield CMS (`frontend/`)  
**Audit Date**: 2026-11-23

---

## 1. Current Layered Architecture

```
Views (src/views/*.vue) & Layouts (src/layouts/MainLayout.vue)
  └─► Components (src/components/*.vue, src/components/users/*.vue)
  └─► Composables (src/composables/*) & Pinia Stores (src/stores/*)
  └─► Application Services (src/services/*)
        └─► Repositories (src/repositories/* -> BaseRepository.ts)
              └─► HTTP Client & Interceptors (src/api/httpClient.ts, interceptors.ts)
              └─► DTOs & Lazy Serializer (src/dto/*, src/lib/lazy.ts)
```

- **Automated Boundary Guard**: `frontend/scripts/check-architecture.mjs` validates import direction (Views/Components/Stores/Composables/i18n cannot import `axios`, `fetch`, `httpClient`, or `repositories`; Services cannot import `axios`, `httpClient`, `views`, or `components`; Repositories cannot import `services`, `stores`, `views`, or `components`) and runs DFS circular-dependency detection across **90 files** with **0 violations**.

---

## 2. Key Architectural Improvements Completed

1. **Layout & Error Boundary Separation**:
   - Extracted `src/layouts/MainLayout.vue` from `src/App.vue`.
   - Added `src/components/ErrorBoundary.vue` (`onErrorCaptured`) and explicit `src/views/NotFound.vue` route.
2. **Centralized Storage & Endpoint Adapters**:
   - `src/utils/sessionStorage.ts` consolidates all `localStorage`/`sessionStorage` access for session tokens and local keys.
   - `src/constants/endpoints.ts` centralizes all API paths.
3. **Request Deduplication, Safe Retries & Cancellation**:
   - `BaseRepository` deduplicates simultaneous identical `GET` requests, retries only idempotent `GET` on transient `502/503/504`, and normalizes `ERR_CANCELED`.
   - `Documents.vue`, `UserManagement.vue`, and `AuditLogs.vue` pass `AbortSignal` via services to cancel stale in-flight requests.
4. **Reusable Base Component System & Domain Modals**:
   - 24 `.vue` components (`src/components/*.vue`, `users/`, `audit/`) + `MainLayout.vue`, all using `<script setup lang="ts">`, compile-time `defineProps<...>()` / `defineEmits<{...}>()`, `useId()` for form labels, WCAG 2.1 attributes (`BaseModal` `<Teleport>` + focus trap, `FileDropzone` keyboard trigger, `ToastContainer` `aria-live`, `ProgressBar` `role="progressbar"`), and `useI18n()`.
   - Eliminated all `any` from Repositories (`BaseRepository.ts` generic defaults changed to `T = unknown`), Services (with runtime narrowing in `EncryptionService`, `DecryptionService`, `KeyService`), and `i18n/index.ts`.

---

## 3. Recommended Next-Stage Improvements

1. Complete adoption of `BaseCard` / `BaseButton` / `BaseSelect` / `BaseInput` across the remaining 5–7 views (`AuditLogs.vue`, `Dashboard.vue`, `Decrypt.vue`, `Encrypt.vue`, `KeyManagement.vue`) and split `AuditLogs.vue` / `KeyManagement.vue` modals into sub-components.
2. Replace remaining `Record<string, any>` in `src/dto/*.ts` and `src/lib/lazy.ts` with `Record<string, unknown>` + strict runtime schema validators (e.g., Zod/OpenAPI codegen).
3. Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` in `tsconfig.json`.

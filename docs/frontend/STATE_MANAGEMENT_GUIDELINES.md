# State Management Guidelines (Pinia & Local Reactivity)

## 1. State Ownership Boundaries
- **Global Pinia Stores (`src/stores/`)**: Reserved strictly for cross-cutting application state:
  - `auth.ts`: Current authenticated `UserProfileDTO`, session initialization/logout state, and role/clearance helpers.
  - `toast.ts`: Global notification queue (`show(message, type)` and auto-dismiss timers).
- **Local Component State**: Form inputs, modal open/close flags, search queries, pagination state, and per-page loading/error messages remain local inside each view or composable (`useAsync`).
- **Large List Performance**: Data tables (`Documents.vue`, `AuditLogs.vue`, `UserManagement.vue`, `Decrypt.vue`) hold DTO arrays in `shallowRef` rather than deep `ref` to avoid unnecessary reactive proxy traversal.

## 2. Cryptographic & Session Security Rules
- **No Persistent Sensitive Secrets**: Passphrases, decrypted plaintext documents, and raw unencrypted private keys are never persisted to `localStorage`, `sessionStorage`, or Pinia persisted plugins.
- **Centralized Storage Adapter**: Session metadata access is isolated in `src/utils/sessionStorage.ts`. Direct `localStorage` / `sessionStorage` calls inside components or services are prohibited.
- **Clean Session Reset**: Logging out or receiving a `401` response clears auth store state and storage via `sessionStorage.ts` before redirecting to `/login`.

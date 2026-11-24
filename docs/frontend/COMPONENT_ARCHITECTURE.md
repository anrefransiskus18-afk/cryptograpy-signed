# Component Architecture & Design System

## 1. Component Taxonomy
Components are organized into two tiers:
1. **Shared Design System Primitives (`src/components/*.vue`)**: Domain-agnostic UI building blocks. They must never import `services/`, `repositories/`, or feature-specific DTOs.
2. **Domain Subcomponents (`src/components/{users,audit,keys}/*.vue`)**: Feature-specific panels and modals extracted from large views to keep views focused on orchestration.

## 2. Shared UI Primitive Inventory
| Component | Responsibility | Accessibility / Behavior Highlights |
| :--- | :--- | :--- |
| `BaseButton.vue` | Primary/secondary/danger/ghost actions | Supports `loading`, `disabled`, `variant`, `size`, spinner state |
| `BaseInput.vue` | Standard text/email/number input | `useId()` label binding, `error` message + `aria-invalid` |
| `BaseSelect.vue` | Typed select dropdown | `useId()` label binding, accessible error state |
| `PasswordInput.vue` | Passphrase/password input with visibility toggle | `aria-pressed` toggle, `useId()` binding |
| `FileDropzone.vue` | Drag-and-drop and click/keyboard file picker | `Enter`/`Space` activation, file size/extension hints |
| `BaseModal.vue` | Accessible dialog container | `<Teleport to="body">`, focus trap, Escape close, backdrop click |
| `ConfirmModal.vue` | Destructive/critical action confirmation | Built atop `BaseModal` with `danger` variant |
| `DataTableCard.vue` | Standardized table wrapper | Integrated loading spinner, empty state, `#header` / `#footer` slots |
| `FilterToolbar.vue` | Search and filter bar | Standardized responsive layout |
| `PaginationBar.vue` | Page navigation controls | Disabled boundary states, page metadata |
| `AlertBanner.vue` | Inline status/error/warning feedback | Semantic `role="alert"` / `role="status"` |
| `StatusBadge.vue` | Semantic status pill | `success`, `warning`, `danger`, `info`, `neutral` variants |
| `StatCard.vue` | KPI metric display card | Icon slot, label, formatted value |
| `PageHeader.vue` | Consistent page title + subtitle + `#actions` | Uniform spacing and typography |
| `ProgressBar.vue` | Determinate operation progress | `role="progressbar"` with `aria-valuenow` |
| `SkeletonLoader.vue` | Loading placeholder | Respects `prefers-reduced-motion` |
| `MonoCopyBox.vue` / `CopyButton.vue` | Monospace fingerprint/hash display + clipboard | Timed copy confirmation feedback |
| `AppBreadcrumbs.vue` | Route-derived navigation breadcrumbs | Uses Vue Router metadata |
| `ToastContainer.vue` | Global toast notification stack | Driven by `useToastStore()` |
| `ErrorBoundary.vue` | Subtree error fallback | Uses `onErrorCaptured` with reset recovery |

## 3. Domain Subcomponents
- `src/components/users/UserCreateModal.vue` — New user provisioning form + validation.
- `src/components/users/UserEditModal.vue` — Role, clearance, and active-status editing.
- `src/components/audit/AuditDetailModal.vue` — Cryptographic hash-chain and metadata inspection modal.
- `src/components/keys/PublicKeyDirectoryTable.vue` — Searchable recipient public-key directory extracted from `KeyManagement.vue`.

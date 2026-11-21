# Component Ecosystem — PT XYZ DocShield

## Reusable Components (`src/components/`)
| Component | Category | Responsibility |
|---|---|---|
| `PageHeader.vue` | Layout | Standardized page title, subtitle, and `#actions` slot |
| `AppBreadcrumbs.vue` | Layout / Navigation | Accessible route breadcrumb synced with `i18n` |
| `DataTableCard.vue` | Data | Loading, empty-state, `#header`, and responsive table wrapper |
| `PaginationBar.vue` | Data | Page navigation controls |
| `StatusBadge.vue` | Feedback / Data | Semantic status pills (`success`, `danger`, `neutral`, etc.) |
| `StatCard.vue` | Data | Dashboard KPI card |
| `AlertBanner.vue` | Feedback | Contextual error/warning/success/info banners |
| `ToastContainer.vue` | Feedback | Global toast notification stack |
| `ProgressBar.vue` | Feedback | Upload / crypto progress indicator |
| `SkeletonLoader.vue` | Feedback | Accessible (`aria-busy="true"`) loading placeholder |
| `BaseModal.vue` | Overlay | Accessible modal (`role="dialog"`, Escape key, backdrop click) |
| `ConfirmModal.vue` | Overlay | Destructive/confirmation dialog built on `BaseModal` |
| `FileDropzone.vue` | Form | Drag-and-drop + click file selector with `#selected` slot |
| `PasswordInput.vue` | Form | Password/passphrase input with visibility toggle |
| `CopyButton.vue` | Utility | Clipboard copy button with visual feedback |
| `MonoCopyBox.vue` | Utility / Data | Monospace hash/PEM display with integrated copy action |

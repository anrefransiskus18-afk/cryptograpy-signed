# UX Improvement Report — Frontend

**Date**: 2026-11-23  

---

## 1. Improvements Implemented
1. **Standardized Form Controls on Core Crypto Views**:
   - Upgraded [Encrypt.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/views/Encrypt.vue) and [Decrypt.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/views/Decrypt.vue) to use `BaseSelect`, `BaseInput`, `BaseButton`, and `useId()` label bindings for recipient selection, classification, origin department, wrap mode, filename, and `.pem` textarea.
2. **Reduced Motion & Focus Feedback**:
   - Added `@media (prefers-reduced-motion: reduce)` in [style.css](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/style.css) and consistent `focus-visible:ring-2` styles in `BaseButton`.
3. **i18n Coverage on Shared Components**:
   - Connected `useI18n()` across shared components (`BaseModal`, `ConfirmModal`, `PaginationBar`, `DataTableCard`, `FilterToolbar`, `CopyButton`, `PasswordInput`, `ProgressBar`, `FileDropzone`, `ToastContainer`) with `ID` & `EN` locale packs.
4. **Graceful Error & 404 Recovery**:
   - Added `ErrorBoundary.vue` and `NotFound.vue` (`404`).

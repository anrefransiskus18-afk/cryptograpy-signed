# Accessibility Audit — Frontend (WCAG 2.2 AA Oriented)

**Date**: 2026-11-23  

---

## 1. Controls Implemented & Verified in Source Code
- **Bypass Block (WCAG 2.4.1)**: Added `"Lewati ke konten utama"` skip link targeting `#main-content` (`tabindex="-1"`) in [MainLayout.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/layouts/MainLayout.vue).
- **Modal Dialogs (WCAG 2.1.2 / 4.1.2)**: [BaseModal.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/components/BaseModal.vue) uses `<Teleport to="body">`, `role="dialog"`, `aria-modal="true"`, `useId()`-linked `:aria-labelledby`, `Escape` close, `Tab`/`Shift+Tab` focus trap, and focus restoration on close.
- **Interactive Controls & Live Regions (WCAG 2.1.1 / 4.1.3)**:
  - [FileDropzone.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/components/FileDropzone.vue): `role="button"`, `tabindex="0"`, `:aria-label`, `Enter`/`Space` keyboard trigger.
  - [ToastContainer.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/components/ToastContainer.vue): `role="status"`, `aria-live="polite"`, `aria-label` on dismiss button.
  - [ProgressBar.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/components/ProgressBar.vue): `role="progressbar"`, `aria-valuenow/min/max`, `aria-label`.
  - [BaseInput.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/components/BaseInput.vue), [BaseSelect.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/components/BaseSelect.vue), [PasswordInput.vue](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/components/PasswordInput.vue): `useId()` `<label :for>`, `aria-invalid`, `aria-describedby`, `aria-pressed`.
- **Reduced Motion (WCAG 2.3.3)**: `@media (prefers-reduced-motion: reduce)` in [style.css](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/style.css).

## 2. Remaining Accessibility Gaps
- Automated browser accessibility scans (`axe-core`, Lighthouse Accessibility, Playwright) were not executed in this offline sandbox.
- `Decrypt.vue` `#stored-doc-select` and `AuditLogs.vue` / `KeyManagement.vue` filters still have a few native `<select>` elements without explicit `<label for>`.

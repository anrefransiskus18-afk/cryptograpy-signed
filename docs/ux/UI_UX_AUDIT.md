# UI/UX Audit — Frontend

**Project**: PT XYZ DocShield CMS (`frontend/`)  
**Date**: 2026-11-23  

---

## 1. Visual Hierarchy & Information Architecture
- Consistent sidebar + top header shell (`MainLayout.vue`) with page title, `AppBreadcrumbs`, dark/light theme toggle, and `ID`/`EN` locale switcher.
- Clear workflow separation across Encryption (`Encrypt.vue`), Decryption (`Decrypt.vue`), Document Registry (`Documents.vue`), Key Management (`KeyManagement.vue`), Audit Trail (`AuditLogs.vue`), and User Access (`UserManagement.vue`).

## 2. Cryptographic UX Controls
- **Encryption**: Clearance mismatch warning (`AlertBanner` warning) blocks invalid recipient selection before upload; 125 MiB limit enforced; `ProgressBar` shows upload/encryption progress.
- **Decryption**: Explicit tamper warning (`422 TAMPER_DETECTED` $\rightarrow$ error banner + toast) and recipient mismatch notice; optional 1-bit tamper simulator for security verification.
- **Key Management**: `ConfirmModal` required before destructive key rotation; `.pem` download and fingerprint copy via `MonoCopyBox`.
- **Resilience**: `ErrorBoundary.vue` (`onErrorCaptured`) and `NotFound.vue` (`404`) prevent blank/dead-end screens.

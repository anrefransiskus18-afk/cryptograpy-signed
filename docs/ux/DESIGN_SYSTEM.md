# Design System Specification — PT XYZ DocShield CMS

**Date**: 2026-11-23  

---

## 1. Design Tokens ([tokens.css](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/styles/tokens.css), [style.css](file:///home/anrefranciscus/hybrid-crypto-framework/frontend/src/style.css))
- **Color Palette**: `--bg-app` (`#f8fafc` / `#0b1120` dark), `--bg-surface` (`#ffffff` / `#111827` dark), `--bg-surface-muted` (`#f1f5f9` / `#1e293b` dark), `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--border-strong`, `--accent-primary` (`#4f46e5` / `#6366f1` dark).
- **Typography**: `Inter` / system sans-serif (`14px` base), `JetBrains Mono` / system monospace for hashes, fingerprints, and PEMs.
- **Radii & Motion**: `--radius-card: 0.75rem`, `--radius-control: 0.5rem`, `--duration-fast: 150ms`, `--duration-normal: 200ms`, plus global `@media (prefers-reduced-motion: reduce)` override in `src/style.css`.

## 2. Standardized Reusable Component Primitives (`src/components/`)
- **Actions & Forms**: `BaseButton`, `BaseInput`, `BaseSelect`, `PasswordInput`, `FileDropzone`, `FilterToolbar`.
- **Containers & Feedback**: `BaseCard`, `BaseModal`, `ConfirmModal`, `DataTableCard`, `PaginationBar`, `AlertBanner`, `ToastContainer`, `StatusBadge`, `StatCard`, `ProgressBar`, `SkeletonLoader`, `ErrorBoundary`.
- **Navigation & Utilities**: `AppBreadcrumbs`, `PageHeader`, `CopyButton`, `MonoCopyBox`, `MainLayout`.

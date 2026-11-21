# Composables & i18n Guide — PT XYZ DocShield

| Composable | Path | Purpose |
|---|---|---|
| `useFormatters` | `src/composables/useFormatters.js` | Byte/time formatting, localized role/classification/action/status labels, `debounce` (with `.cancel()`), `copyToClipboard` |
| `useTheme` | `src/composables/useTheme.js` | Reactive Light/Dark mode (`theme`, `isDark`, `setTheme`, `toggleTheme`) persisted in `localStorage` |
| `usePermissions` | `src/composables/usePermissions.js` | RBAC helpers (`isAdmin`, `canVerifyAuditChain`, `canDeleteDocument`, `hasClearance`) |
| `useAsync` | `src/composables/useAsync.js` | Async state (`data`, `loading`, `error`, `execute`, `cancel`, `reset`) with `AbortController` unmount cleanup |
| `useI18n` | `src/i18n/index.js` | Indonesian (`id`) & English (`en`) translation (`locale`, `setLocale`, `t`) with parameter interpolation and fallback |

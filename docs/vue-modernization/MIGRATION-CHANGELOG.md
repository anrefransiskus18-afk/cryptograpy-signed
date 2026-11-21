# Migration Changelog — Vue.js Modernization

| File | Summary of Change |
|---|---|
| `frontend/jsconfig.json`, `frontend/src/types/domain.d.ts` | Added TypeScript/JSDoc configuration and domain interfaces (`UserProfile`, `DocumentItem`, `UserRole`, `ClassificationLevel`, `KeyWrapMode`). |
| `frontend/src/styles/tokens.css`, `frontend/src/style.css`, `frontend/tailwind.config.js` | Added CSS design tokens, `darkMode: "class"`, and Light/Dark theme rules. |
| `frontend/src/i18n/index.js`, `locales/id.js`, `locales/en.js` | Implemented Indonesian & English i18n plugin, `useI18n()`, interpolation, and `localStorage` persistence. |
| `frontend/src/composables/useTheme.js`, `usePermissions.js`, `useAsync.js` | Added reusable composables for Dark/Light theme, RBAC permissions, and AbortController-aware async state. |
| `frontend/src/components/AppBreadcrumbs.vue`, `SkeletonLoader.vue` | Added accessible breadcrumb navigation and skeleton loader components. |
| `frontend/src/utils/errors.js` | Added typed error subclasses (`ValidationError`, `AuthenticationError`, `AuthorizationError`, `NetworkError`, `TimeoutError`, `ApiError`, `CryptographyError`, `UnexpectedError`). |
| `frontend/src/main.js`, `frontend/src/App.vue`, `frontend/src/views/Login.vue`, `frontend/src/router/index.js`, `frontend/src/composables/useFormatters.js` | Integrated `i18nPlugin`, `useTheme` toggle, `router.isReady()` mount guard, `hasValidStoredSession()` guard, and localized formatters. |
| `frontend/scripts/check-architecture.mjs`, `frontend/tests/crypto-reliability.test.js` | Extended boundary checks to `composables/` and `i18n/`, and added unit tests for i18n, typed errors, `useTheme`, and `usePermissions`. |

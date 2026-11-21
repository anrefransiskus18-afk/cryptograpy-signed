# Vue.js Architecture — PT XYZ DocShield Frontend

## 1. Technology Stack (Verified)
- **Vue:** `^3.5.13` (Composition API with `<script setup>`)
- **State Management:** Pinia `^4.1.0`
- **Routing:** Vue Router `^4.5.0` (Web History + lazy-loaded route chunks)
- **HTTP Client:** Axios `^1.7.9`
- **Styling:** Tailwind CSS `^3.4.17` + CSS Design Tokens (`src/styles/tokens.css`, `darkMode: "class"`)
- **Build Tool:** Vite `^6.0.5`
- **Type Tooling:** `jsconfig.json` + `src/types/domain.d.ts`

## 2. Layered Dependency Architecture

```text
Views (src/views/*.vue) & Components (src/components/*.vue)
   │  (UI rendering, user interaction, composables)
   ▼
Services (src/services/*.js) & Stores (src/stores/*.js)
   │  (Business validation, orchestration, DTO mapping, reactive session/toast state)
   ▼
Repositories (src/repositories/*.js)
   │  (Pure HTTP transport via centralized API_ENDPOINTS)
   ▼
HTTP Client & Interceptors (src/api/httpClient.js, interceptors.js)
```

## 3. Enforced Architectural Boundaries (`scripts/check-architecture.mjs`)
- `views/`, `components/`, `stores/`, `composables/`, and `i18n/` cannot import `axios`, `fetch`, `httpClient`, or `repositories/`.
- `services/` cannot import `axios`, `httpClient`, `views/`, or `components/`.
- `repositories/` cannot import `services/`, `stores/`, `views/`, or `components/`.
- Zero circular dependencies verified by DFS graph traversal.
- Direct `console.*` calls are forbidden outside `src/utils/logger.js`.

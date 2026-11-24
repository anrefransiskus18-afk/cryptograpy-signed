# Frontend Engineering Standards

## 1. Vue 3 Standards
- **Composition API + `<script setup lang="ts">`**: Mandatory across all views, layouts, and components. No Options API.
- **Type-based Props & Emits**: Use `defineProps<{ ... }>()` (with `withDefaults` when defaults are required) and `defineEmits<{ (e: "...", ...): void }>()`. Avoid runtime object prop declarations.
- **Reactivity Discipline**: Use `shallowRef` for large DTO collections (`Documents.vue`, `AuditLogs.vue`, `UserManagement.vue`, `Decrypt.vue`) to avoid deep recursive proxy overhead.
- **Lifecycle & Cleanup**: Cancel in-flight requests on unmount or superseded filter changes via `AbortController`. Clean up `URL.createObjectURL(...)` handles and event listeners in `onUnmounted`.

## 2. Accessibility & UI Standards (WCAG 2.2 AA)
- **Unique Accessible IDs**: Use Vue 3.5 `useId()` to bind `<label :for="inputId">` to `<input :id="inputId">` and `aria-describedby` to validation error messages.
- **Modal Accessibility**: `BaseModal.vue` uses `<Teleport to="body">`, `role="dialog"`, `aria-modal="true"`, Escape-to-close, focus trap (`Tab` / `Shift+Tab`), and focus restoration on close.
- **Keyboard & Motion**: Interactive dropzones (`FileDropzone.vue`) support `Enter`/`Space`; `MainLayout.vue` provides a `#main-content` skip link; `src/style.css` respects `@media (prefers-reduced-motion: reduce)`.
- **Self-Hosted Fonts**: No external CDN font links; CSP-safe local font stack.

## 3. Code Quality & Tooling Gates
Every code change must pass `npm run check`:
1. `npm run lint:arch` — Architecture boundaries, DFS cycle detection, security static rules (`scripts/check-architecture.mjs`).
2. `npm run typecheck` — `vue-tsc --noEmit` with strict TypeScript configuration.
3. `npm test` — Node test runner (`node --test tests/*.test.js`).
4. `npm run build` — Vite production bundle (`sourcemap: false`, manual `vue-vendor` / `http-vendor` chunk splitting).

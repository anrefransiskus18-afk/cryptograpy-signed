# Repository & Service Integration

## 1. Boundary Verification (`scripts/check-architecture.mjs`)
- **Repositories (`src/repositories/*.ts`)**: Extend `BaseRepository`, reference `API_ENDPOINTS`, attach `queryStruct`/`requestStruct`/`responseStruct`, and forward `{ signal?: AbortSignal }`. Zero business workflows.
- **Services (`src/services/*.ts`)**: Enforce domain preconditions (e.g., 125 MiB boundary, allowed extensions, passphrase policy, PEM structure), coordinate multi-step flows, and return typed DTOs or domain models. Zero raw `axios`/`httpClient` imports.
- **Views & Composables (`src/views/*.vue`, `src/composables/*.ts`)**: Consume services and Pinia stores exclusively; zero direct `httpClient` or `axios` calls.

## 2. Automated Enforcement
`npm run lint:arch` scans all `91` TypeScript/Vue files in `src/` and fails the build on any boundary violation or circular dependency (`0 violations` verified).

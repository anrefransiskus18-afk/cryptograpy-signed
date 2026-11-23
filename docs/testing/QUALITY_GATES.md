# Automated Quality Gates — Frontend

| Gate | Command | CI Integration | Status |
| :--- | :--- | :--- | :--- |
| Architecture, Cycle & Hygiene Lint | `npm run lint:arch` | `.github/workflows/ci.yml`, `.gitlab-ci.yml` | **PASSED** (`90 files, 0 violations`) |
| Strict TypeScript & Vue Template Check | `npm run typecheck` | `.github/workflows/ci.yml`, `.gitlab-ci.yml` | **PASSED** (`0 errors`) |
| Unit, Integration, Crypto, Fuzz & Security Tests | `npm test` | `.github/workflows/ci.yml`, `.gitlab-ci.yml` | **PASSED** (`50/50`) |
| Coverage Report | `npm run test:coverage` | `.github/workflows/ci.yml`, `.gitlab-ci.yml` | **PASSED** (`77.91% lines`, `70.63% branches`, `90.88% funcs`) |
| Production Build | `npm run build` | `.github/workflows/ci.yml`, `.gitlab-ci.yml` | **PASSED** |
| Dependency Vulnerability Audit | `npm audit --audit-level=high` | `.github/workflows/ci.yml`, `.gitlab-ci.yml` | **Skipped Offline** (requires registry access) |
| ESLint / Prettier / Component DOM / Playwright E2E | — | Backlog | **Not Installed** in `package.json` |

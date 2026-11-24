# Pipeline Implementation

## 1. Implemented Jobs in `.github/workflows/ci.yml`
1. **`backend-check`**:
   - Python `3.12` with `pip` cache (`backend/requirements.txt`).
   - Dependency audit: `pip-audit -r requirements.txt`.
   - Bytecode syntax check: `python -m py_compile app/*.py app/api/*.py app/core/*.py app/cryptography/*.py app/dto/*.py app/repositories/*.py app/services/*.py`.
   - Test suite: `pytest -v` (`backend/tests/test_*.py`).
2. **`frontend-check`**:
   - Node `22` with `npm ci` using `frontend/package-lock.json`.
   - Static architecture & security gate: `npm run lint:arch`.
   - Strict TypeScript check: `npm run typecheck`.
   - Unit/crypto/contract coverage + integration tests: `npm run test:coverage` and `npm run test:integration`.
   - Dependency SCA: `npm audit --audit-level=high`.
   - Production build: `npm run build` (`VITE_API_BASE_URL=/api/v1`, `VITE_SHOW_DEMO_ACCOUNTS=false`).
   - Artifact hygiene check: fails if `dist/` contains `.map` files or private-key / `DEFAULT_JWT_SECRET` patterns.
3. **`deploy-staging` & `deploy-production`**:
   - Protected GitHub Environments (`staging` and `production`), gated on `[backend-check, frontend-check]`.

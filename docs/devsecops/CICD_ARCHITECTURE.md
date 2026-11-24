# CI/CD Architecture

## 1. Platform & Workflow Overview
The repository uses **GitHub Actions** ([ci.yml](file:///home/anrefranciscus/hybrid-crypto-framework/.github/workflows/ci.yml)) triggered on `push` and `pull_request` to `main`, `master`, and `staging`.

```text
  push / pull_request (main, master, staging)
         │
         ├──► backend-check (Python 3.12 + pip cache)
         │      ├─ pip-audit -r requirements.txt
         │      ├─ python -m py_compile
         │      └─ pytest -v
         │
         └──► frontend-check (Node 22 + npm cache)
                ├─ npm ci
                ├─ npm run lint:arch (91 files, cycle + security)
                ├─ npm run typecheck (vue-tsc --noEmit)
                ├─ npm run test:coverage
                ├─ npm run test:integration
                ├─ npm audit --audit-level=high
                ├─ npm run build (VITE_SHOW_DEMO_ACCOUNTS=false)
                ├─ Artifact hygiene check (no .map, no secret patterns)
                └─ upload-artifact (frontend-dist)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
  deploy-staging              deploy-production
  (push to staging)           (push to main, manual approval)
```

## 2. Concurrency & Caching
- **PR Concurrency**: `concurrency` cancels superseded `pull_request` runs while preserving branch builds on `main`/`staging`.
- **Caching**: `setup-python@v5` caches `pip` keyed on `backend/requirements.txt`; `setup-node@v4` caches `npm` keyed on `frontend/package-lock.json`.

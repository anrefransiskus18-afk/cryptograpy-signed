# DevSecOps Audit Report

## 1. Findings & Changes Implemented
- **CI Workflow Hardening (`.github/workflows/ci.yml`)**:
  - Added `concurrency` cancellation for PRs.
  - Enabled `pip` caching in `backend-check` alongside existing `npm` caching.
  - Added `Validate Production Artifact Hygiene` in `frontend-check` to fail builds if `.map` files or private-key / `DEFAULT_JWT_SECRET` strings appear in `frontend/dist`.
- **Docker & Runtime Hygiene**:
  - `docker-compose.yml` enforces required secret interpolation (`:?`), `json-file` log rotation (`10m` × `5`), MySQL/backend/frontend healthchecks, and Prometheus/Grafana monitoring services.

## 2. Local Verification & Limitations
- **Executed locally**: `npm run lint:arch`, `npm run typecheck`, `npm test`, `npm run build`, and `python3 -m py_compile` on backend Python modules.
- **Not executable in offline sandbox**: `pip-audit`, `npm audit`, `pytest` (requires Flask/SQLAlchemy runtime environment), and live Docker Compose stack build.
- **Unresolved Risks**: `eslint`/`prettier` are not configured in `frontend/package.json` (`REM-11`).

# Build and Release Strategy

## 1. Reproducible Builds
- **Frontend**: `npm ci` installs exact versions from `frontend/package-lock.json`, followed by `vite build` (`sourcemap: false`, deterministic vendor chunks `vue-vendor` and `http-vendor`).
- **Backend**: `backend/Dockerfile` installs pinned packages from `backend/requirements.txt` and runs via Gunicorn (`wsgi.py`).
- **Container Orchestration**: `docker-compose.yml` defines `mysql:8.0`, `backend`, `frontend` (Nginx serving `dist/` and proxying `/api/`), `prometheus`, and `grafana`.

## 2. Release & Approval Flow
- **Staging**: Automatic on `push` to `staging` after `backend-check` + `frontend-check` pass.
- **Production**: Triggered on `push` to `main` under GitHub `environment: production` requiring manual reviewer approval (`docker compose -p ptxyz-prod --env-file .env.production up -d --build`).

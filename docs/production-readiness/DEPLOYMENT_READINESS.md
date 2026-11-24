# Deployment Readiness

## 1. Container & CI/CD Readiness
- **Orchestration**: `docker-compose.yml` defines `mysql:8.0`, `backend` (healthcheck `/health`), `frontend` (Nginx on `5173`), `prometheus:v2.55.1`, and `grafana:11.3.0`.
- **Environment Templates**: `.env.production.example` and `.env.staging.example` enforce non-default `MYSQL_*`, `JWT_SECRET_KEY`, `SEED_DEFAULT_PASSWORD`, and `SEED_KEY_PASSPHRASE`.
- **CI Pipeline**: `.github/workflows/ci.yml` gates `deploy-staging` and `deploy-production` (manual approval) on `backend-check` and `frontend-check` (including `dist/` artifact hygiene validation).

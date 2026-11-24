# Operational Runbook

## 1. Startup & Shutdown
```bash
# Production stack startup
docker compose -p ptxyz-prod --env-file .env.production up -d --build
# Graceful shutdown
docker compose -p ptxyz-prod --env-file .env.production down
```

## 2. Health Verification
```bash
curl -fsS http://127.0.0.1:8000/api/v1/health
curl -fsS http://127.0.0.1:8000/api/v1/metrics | head -n 20
```

## 3. Troubleshooting Playbook
- **API 5xx / 503 Health**: Check `docker compose -p ptxyz-prod logs --tail=100 backend mysql`; verify `DATABASE_URL` and MySQL readiness.
- **Correlating User Error**: Filter backend JSON logs by `correlation_id` matching the frontend `X-Correlation-ID` header.
- **422 `TAMPER_DETECTED` Spike**: Inspect `/api/v1/audit` and verify `.enc` file integrity (`HC01`/`HC02` header, 129/145-byte prefix) or key rotation history.
- **Rollback**: Check out previous release tag and re-run `docker compose -p ptxyz-prod --env-file .env.production up -d --build` (see `docs/devsecops/ROLLBACK_PROCEDURE.md`).

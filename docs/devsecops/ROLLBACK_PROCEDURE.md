# Rollback Procedure

## 1. Containerized Deployment Rollback (`docker-compose.yml`)
1. Identify the last known-good Git tag / commit (`git log -n 5 --oneline`) and verify `.env.production` is intact.
2. Check out the previous release commit or tag on the deployment host:
   ```bash
   git checkout <previous-known-good-tag>
   docker compose -p ptxyz-prod --env-file .env.production up -d --build
   ```
3. Verify service health:
   ```bash
   curl -fsS http://127.0.0.1:8000/api/v1/health
   curl -fsS http://127.0.0.1:5173/ >/dev/null
   ```
4. Inspect backend logs (`docker compose -p ptxyz-prod logs --tail=100 backend`) for schema or startup errors.

## 2. Database & Cryptographic Compatibility Notes
- Do **not** run destructive SQL `DROP` statements during rollback.
- Additive column migrations in `backend/app/__init__.py` (`_ensure_schema_columns`) are backward-compatible.
- `HC01`/`HC02` encrypted files in `backend/storage/encrypted/` remain readable across versions as container headers are self-describing.

# Backend Remediation Tracker

| ID | Finding | Severity | Location | Status | Action / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BE-01 | Missing `/api/v1/audit-logs/verify-chain` alias caused 404 vs frontend endpoint | **High** | `backend/app/api/audit.py` | **Fixed** | Added `/api/v1/audit-logs/verify-chain` route alias & aligned frontend `endpoints.ts` |
| BE-02 | CORS `Allow-Headers` omitted `X-CSRF-Token` & `Allow-Methods` omitted `PATCH` | **Medium** | `backend/app/__init__.py` | **Fixed** | Updated `Access-Control-Allow-Headers` & `Access-Control-Allow-Methods` |
| BE-03 | In-memory JWT revocation & rate buckets are process-local | **Medium** | `backend/app/core/security.py` | **Open (Accepted for single-worker)** | Migrate to Redis when scaling to multi-worker/multi-replica |
| BE-04 | `pytest` runtime dependencies absent in local system Python | **Low (Env)** | `backend/requirements.txt` | **Open (Env)** | Executed in CI `backend-check` (`pip install -r backend/requirements.txt`) |

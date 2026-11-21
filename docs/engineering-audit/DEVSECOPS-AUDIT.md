# DevSecOps & CI/CD Audit — PT XYZ Hybrid Cryptography Framework

**Audit Date:** 2026-11-21

---

## 1. CI/CD Pipeline (`.github/workflows/ci.yml`)
- **Backend Job (`backend-check`):** Python 3.12, `pip install -r backend/requirements.txt`, `python -m py_compile` across `app/*.py`, `app/api/*.py`, `app/core/*.py`, `app/cryptography/*.py`, `app/dto/*.py`, `app/repositories/*.py`, and `pytest -v`.
- **Frontend Job (`frontend-check`):** Node 22, `npm ci`, `npm run lint:arch`, `npm run test:coverage`, `npm run test:integration`, `npm audit --audit-level=high`, production `vite build` (`VITE_API_BASE_URL=/api/v1`, `VITE_SHOW_DEMO_ACCOUNTS=false`), and `frontend-dist` artifact upload.
- **Deployment Gate (`deploy-production`):** Requires both `backend-check` and `frontend-check`, runs only on `push` to `main`, and requires manual GitHub `production` environment approval.

---

## 2. Container & Runtime Configuration
- **`backend/Dockerfile`:** `python:3.12-slim`, `APP_ENV=production`, `gunicorn --workers 1 --threads 8 --timeout 300 --bind 0.0.0.0:8000 wsgi:app`.
- **`frontend/Dockerfile`:** Multi-stage `node:20-alpine` builder -> `nginx:alpine` serving `/usr/share/nginx/html` and reverse-proxying `/api/` to `http://backend:8000` (`client_max_body_size 130M`).
- **Hardening Applied:** `frontend/nginx.conf` now sets `server_tokens off`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Content-Security-Policy`. `frontend/src/config/demo.js` now defaults `DEMO_MODE` to `false` in production builds even if `VITE_SHOW_DEMO_ACCOUNTS` is omitted.

---

## 3. Gaps & Recommendations
- **Offline `npm audit` Blocker:** `npm audit` failed in this sandbox (`EAI_AGAIN registry.npmjs.org`) due to network isolation; CI (`ubuntu-latest`) enforces `npm audit --audit-level=high`.
- **Missing Python Dependency Audit:** Consider adding `pip-audit` to `backend-check` in CI for Python CVE scanning.
- **Container Non-Root User:** `backend/Dockerfile` and `frontend/Dockerfile` currently run as default container users; adding a non-root `USER` directive in `backend/Dockerfile` would further reduce container blast radius.

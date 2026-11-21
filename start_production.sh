#!/usr/bin/env bash
# Menjalankan backend dengan Gunicorn (produksi). Pastikan environment variable penting sudah diisi
# (lihat backend/.env.example): APP_ENV=production, JWT_SECRET_KEY, DATABASE_URL, dst.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="${PYTHON_BIN:-python3}"

cd "$ROOT_DIR/backend"
export APP_ENV="${APP_ENV:-production}"

# 1 worker + banyak thread: lock rantai hash audit berlaku di dalam satu proses.
exec "$PY" -m gunicorn --workers 1 --threads "${GUNICORN_THREADS:-8}" \
  --timeout 300 --bind "${BIND_ADDR:-0.0.0.0:8000}" wsgi:app

#!/usr/bin/env bash
# Menjalankan backend dengan Gunicorn (staging / production).
# Otomatis mendeteksi virtualenv dan memuat ENV_FILE (.env.production / .env.staging) bila ada.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -n "${PYTHON_BIN:-}" ]; then
  PY="$PYTHON_BIN"
elif [ -x "$ROOT_DIR/.venv/bin/python" ]; then
  PY="$ROOT_DIR/.venv/bin/python"
elif [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  PY="$ROOT_DIR/backend/.venv/bin/python"
else
  PY="python3"
fi

export APP_ENV="${APP_ENV:-production}"
DEFAULT_ENV_FILE="$ROOT_DIR/.env.${APP_ENV}"
ENV_FILE="${ENV_FILE:-$DEFAULT_ENV_FILE}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

PORT="${BACKEND_PORT:-8000}"
BIND_ADDR="${BIND_ADDR:-0.0.0.0:${PORT}}"

cd "$ROOT_DIR/backend"

# 1 worker + multi-thread: lock rantai hash audit berlaku di dalam satu proses.
exec "$PY" -m gunicorn --workers 1 --threads "${GUNICORN_THREADS:-8}" \
  --timeout 300 --bind "$BIND_ADDR" wsgi:app

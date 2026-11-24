#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

if [ -n "${PYTHON_BIN:-}" ]; then
  VENV_PY="$PYTHON_BIN"
elif [ -x "$ROOT_DIR/.venv/bin/python" ]; then
  VENV_PY="$ROOT_DIR/.venv/bin/python"
elif [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  VENV_PY="$ROOT_DIR/backend/.venv/bin/python"
else
  VENV_PY="python3"
fi

is_port_busy() {
  local port="$1"
  "$VENV_PY" -c "import socket, sys; s=socket.socket(); s.settimeout(0.4); rc=s.connect_ex(('127.0.0.1', int(sys.argv[1]))); s.close(); sys.exit(0 if rc == 0 else 1)" "$port" 2>/dev/null
}

echo "====================================================================="
echo "  STARTING HYBRID CRYPTOGRAPHY FRAMEWORK (LOCAL DEV)"
echo "  Backend : http://127.0.0.1:${BACKEND_PORT}"
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "====================================================================="

BACKEND_PID=""
FRONTEND_PID=""
cleanup() {
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if is_port_busy "$BACKEND_PORT"; then
  echo "[INFO] Port $BACKEND_PORT sudah aktif. Menggunakan backend yang sedang berjalan."
else
  cd "$ROOT_DIR/backend"
  APP_ENV="${APP_ENV:-development}" BACKEND_PORT="$BACKEND_PORT" "$VENV_PY" run.py &
  BACKEND_PID=$!

  for _ in $(seq 1 30); do
    if is_port_busy "$BACKEND_PORT"; then
      break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      echo "[ERROR] Backend gagal menyala di port $BACKEND_PORT."
      echo "        Jika port ditahan proses Windows/Docker, cek: netstat -ano | findstr :$BACKEND_PORT"
      exit 1
    fi
    sleep 0.5
  done
fi

cd "$ROOT_DIR/frontend"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}" npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

wait

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "${PYTHON_BIN:-}" ]; then
  VENV_PY="$PYTHON_BIN"
elif [ -x "$ROOT_DIR/.venv/bin/python" ]; then
  VENV_PY="$ROOT_DIR/.venv/bin/python"
elif [ -x "$ROOT_DIR/backend/.venv/bin/python" ]; then
  VENV_PY="$ROOT_DIR/backend/.venv/bin/python"
else
  VENV_PY="python3"
fi

echo "====================================================================="
echo "  STARTING HYBRID CRYPTOGRAPHY FRAMEWORK (BACKEND :8000 | VUE :5173)"
echo "====================================================================="

cd "$ROOT_DIR/backend"
"$VENV_PY" run.py &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT
wait

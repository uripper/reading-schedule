#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PS_SCRIPT="$ROOT_DIR/scripts/install_and_run_windows_hot.ps1"
WIN_ROOT="$(wslpath -w "$ROOT_DIR")"
WIN_SCRIPT="$(wslpath -w "$PS_SCRIPT")"
PYTHON_SPEC="${1:-3}"
POLL_SECONDS="${2:-2}"

PS_PID=""

cleanup() {
  if [[ -n "$PS_PID" ]]; then
    taskkill.exe /PID "$PS_PID" /T /F >/dev/null 2>&1 || true
  fi
}

trap cleanup INT TERM EXIT

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$WIN_SCRIPT" -SourcePath "$WIN_ROOT" -PythonSpec "$PYTHON_SPEC" -PollSeconds "$POLL_SECONDS" &
PS_PID=$!
wait "$PS_PID"
STATUS=$?

trap - INT TERM EXIT
exit "$STATUS"

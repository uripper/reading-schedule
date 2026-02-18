#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PS_SCRIPT="$ROOT_DIR/scripts/install_and_run_windows.ps1"
WIN_ROOT="$(wslpath -w "$ROOT_DIR")"
WIN_SCRIPT="$(wslpath -w "$PS_SCRIPT")"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$WIN_SCRIPT" -SourcePath "$WIN_ROOT"

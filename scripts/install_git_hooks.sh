#!/usr/bin/env bash
set -euo pipefail

HOOKS_PATH=".githooks"
PRE_PUSH_HOOK="${HOOKS_PATH}/pre-push"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[hooks] Not in a git work tree; skipping hook installation."
  exit 0
fi

if [ ! -f "${PRE_PUSH_HOOK}" ]; then
  echo "[hooks] Missing ${PRE_PUSH_HOOK}; cannot install hooks."
  exit 1
fi

git config core.hooksPath "${HOOKS_PATH}"
chmod +x "${PRE_PUSH_HOOK}"

echo "[hooks] Installed git hooks from ${HOOKS_PATH}."
echo "[hooks] pre-push will run: npm run ci:local"

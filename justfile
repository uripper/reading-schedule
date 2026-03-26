set shell := ["zsh", "-uc"]

# Show available commands
default:
  @just --list

# Daily development
dev:
  pnpm run dev:desktop

desktop:
  pnpm run dev:desktop

mobile:
  pnpm run dev:mobile

android:
  pnpm run dev:mobile:android

ios:
  pnpm run dev:mobile:ios

windows:
  pnpm run dev:windows

windows-hot:
  pnpm run dev:windows:hot

# Build
build:
  pnpm run build:contracts
  pnpm run build:desktop

build-contracts:
  pnpm run build:contracts

build-desktop:
  pnpm run build:desktop

build-mobile:
  pnpm run build:mobile

# Lint / format
lint:
  just lint-ts

lint-ts:
  pnpm run lint:desktop
  pnpm run lint:packages
  pnpm run lint:mobile

fix:
  just fix-ts

fix-ts:
  pnpm run format:typescript

# Type checking
check:
  just typecheck

typecheck:
  just typecheck-ts

typecheck-ts:
  pnpm run typecheck:contracts
  pnpm run typecheck:desktop
  pnpm run typecheck:mobile

typecov:
  pnpm run typecov

typecov-strict:
  pnpm run typecov:strict

# Tests
test:
  just test-desktop

test-desktop:
  pnpm run test:desktop

# Full validation
verify:
  just lint
  just typecheck
  just test

ci:
  pnpm run ci:local

# Analysis / maintenance
audit:
  pnpm run styleaudit

knip:
  pnpm run knip

knip-strict:
  pnpm run knip:strict

knip-debug:
  pnpm run knip:debug

# Sync issues between GitHub and local
sync:
  pnpm run issues:sync

hooks:
  pnpm run hooks:install

clean:
  rm -rf dist coverage .pytest_cache .ruff_cache

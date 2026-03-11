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

planner-api:
  pnpm run dev:planner-api

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
  just lint-py
  just lint-ts

lint-py:
  pnpm run lint:python

lint-py-all:
  pnpm run lint:python:all

lint-ts:
  pnpm run lint:desktop
  pnpm run lint:packages
  pnpm run lint:mobile

fix:
  just fix-py
  just fix-ts

fix-py:
  pnpm run lint:python:fix

fix-py-unsafe:
  pnpm run lint:python:fix:unsafe

fix-ts:
  pnpm run format:typescript

format-py:
  pnpm run format:python

jsdoc:
  pnpm run lint:desktop:jsdoc

jsdoc-fix:
  pnpm run lint:desktop:jsdoc:fix

# Type checking
check:
  just typecheck

typecheck:
  just typecheck-py
  just typecheck-ts

typecheck-py:
  pnpm run typecheck:python

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
  just test-py
  just test-desktop

test-py:
  pnpm run test:python

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
  pnpm run audit

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

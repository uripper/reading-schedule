# ISSUE-098: Document and validate runtime environment variables

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `docs`, `runtime`, `desktop`, `mobile`

Problem:

Environment variables are spread across code and only partially documented. `README.md` covers `UI_SCALE` and `EXPO_PUBLIC_PLANNER_API_BASE_URL`, but runtime code also uses `PYTHON_BIN` and `READING_PLAN_BRIDGE_TIMEOUT_MS`. Validation is inconsistent: some values are trimmed or clamped, while others are accepted raw.

Expected:

All supported environment variables should be inventoried in one place, documented with defaults and examples, and validated at runtime with clear fallback or error behavior.

Definition of done:

- Inventory every user-controlled environment variable used by desktop, mobile, and scripts.
- Add a single documentation table with defaults, examples, and target scope.
- Normalize validation behavior so invalid values fail clearly or fall back intentionally.
- Add tests for invalid and missing values where behavior matters.
- Make the documented list part of release and contribution docs.

Context:

- `README.md`
- `mobile/src/config/mobile_env.ts`
- `electron/main/zoom.ts`
- `electron/main/bridge/constants.ts`
- `electron/main/bridge/context.ts`
- `electron/main/bridge/runner.ts`


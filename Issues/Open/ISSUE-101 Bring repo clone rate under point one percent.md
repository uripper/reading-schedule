# ISSUE-101: Bring repo clone rate under 0.1 percent

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `refactor`, `tooling`

Problem:

A historical jscpd run reported 0.96% duplicated lines against a 0.1% target. Its source roots and temporary report predate the current layout, so that figure and its hotspot ranking are not a current baseline. The dependency is installed, but no root script or hosted check enforces the target. Remeasure the current source roots before choosing extractions, including whether Rust is covered by the selected tool.

Expected:

Repository duplication should be reduced to 0.1% or lower, and clone-rate enforcement should be part of required validation so the target does not regress.

Definition of done:

- Establish a reproducible baseline for apps, packages, and mobile source, excluding generated output and dependencies, then prioritize the highest-value current hotspots.
- Extract shared types, helpers, or constants instead of copy-pasting near-identical branches.
- Avoid fake abstractions that only move duplication sideways.
- Add a documented `jscpd` command to repository validation.
- Wire clone-rate enforcement into hosted and local required checks.

Context:

- `packages/contracts/src/types_subfolders/types_app.ts`
- `packages/frontend/src/renderer/calendar/details_session_today.ts`
- `packages/frontend/src/renderer/calendar/details_session_past.ts`
- `packages/frontend/src/renderer/book_lookup/keyboard.ts`
- `packages/frontend/src/renderer/app/date_keys.ts`
- `mobile/src/features/today/use_today_data.ts`
- `package.json`
- `scripts/style_audit/config.mjs`

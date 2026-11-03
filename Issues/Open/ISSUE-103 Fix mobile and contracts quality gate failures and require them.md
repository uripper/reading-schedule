# ISSUE-103: Fix mobile and contracts quality gate failures and require them

**Type:** tech-debt
**Priority:** P1
**Labels:** `tech-debt`, `mobile`, `contracts`, `ci`

Problem:

Repository quality gates are not passing consistently across supported targets. `pnpm run lint:mobile` reports current lint errors, `pnpm run typecheck:mobile` fails because `mobile/src/api/planner_client.ts` omits the required `PlannerApi.resolveCoverSrc` method, and `pnpm run lint:packages` also reports errors across package sources. These checks are also absent from `ci:local`, so they are easy to miss.

Expected:

Mobile and shared-contracts validation should pass cleanly and be treated as required repository checks, not optional side paths.

Definition of done:

- Fix current `pnpm run lint:mobile` failures.
- Fix current `pnpm run typecheck:mobile` failure in `mobile/src/api/planner_client.ts`.
- Fix current `pnpm run lint:packages` failures.
- Add these commands to the required local and hosted validation path.
- Keep the target support matrix aligned with the checks that actually run.
- Account for the mobile HTTP adapter still targeting /api routes without a server implementation in this repository; choose a supported transport instead of treating the removed backend as available.

Context:

- `package.json`
- `mobile/package.json`
- `mobile/src/api/planner_client.ts`
- `mobile/src/navigation/mobile_navigation.tsx`
- `mobile/src/features/today/today_theme_transition_layer.tsx`
- `packages/contracts/src/`


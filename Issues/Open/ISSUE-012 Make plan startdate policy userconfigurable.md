# ISSUE-012: Make plan start-date policy user-configurable


**Type:** enhancement  
**Priority:** P1  
**Labels:** `enhancement`, `planner`, `desktop`

Problem:

Planner payload currently forces `start_date` to tomorrow, even when users may want today/custom.

Expected:

User can choose start policy (`today`, `tomorrow`, `custom`) in settings.

Definition of done:

- Add setting and serialization.
- Remove hardcoded forced-tomorrow behavior.
- Add tests for each policy path.

Context:

- `electron/renderer/app/plan.ts`
- `electron/renderer/settings/config.ts`
- `electron/renderer/settings.ts`


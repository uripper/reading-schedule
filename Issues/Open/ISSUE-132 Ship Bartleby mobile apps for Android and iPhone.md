# ISSUE-132: Ship Bartleby mobile apps for Android and iPhone

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `mobile`

Problem:

Bartleby is only usable as a desktop app. Users cannot check today's reading or log progress from their phone.

Expected:

Bartleby has mobile apps for Android and iPhone that cover the core daily workflow.

Definition of done:

- Decide the first-release scope, such as Today, logging progress, and viewing the schedule.
- Choose a mobile host, planner interface, and persistence model. Evaluate reuse of the shared Rust planner and TypeScript contracts.
- Build and validate the Android and iPhone apps with the chosen strategy.
- Add the chosen client's lint, type checks, and tests to required validation.
- Publish to the Google Play Store and Apple App Store.

Context:

- `packages/planner/` and `packages/contracts/`
- Related to ISSUE-016, multi-device sync, for sharing progress between desktop and mobile.

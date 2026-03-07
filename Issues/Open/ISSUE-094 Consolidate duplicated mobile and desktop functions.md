# ISSUE-094: Consolidate duplicated mobile and desktop functions

**Type:** tech-debt
**Priority:** P2
**Labels:** `tech-debt`, `refactor`, `desktop`

Problem:

Some functions are duplicated across mobile and desktop implementations. That increases maintenance cost and makes it easier for behavior to drift between clients.

Expected:

Shared cross-platform logic should live in reusable modules or shared components where that improves correctness and maintainability without creating awkward coupling.

Definition of done:

- Audit duplicated mobile and desktop functions and identify the best candidates for consolidation.
- Extract shared logic into reusable modules where responsibilities truly overlap.
- Avoid pushing client-specific UI details into forced abstractions.
- Add or update tests around extracted shared behavior.

Context:

- `mobile/src/`
- `electron/renderer/`
- `packages/contracts/src/`

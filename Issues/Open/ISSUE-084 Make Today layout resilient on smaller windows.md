# ISSUE-084: Make Today layout resilient on smaller windows

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

The Today layout breaks down quickly on smaller screens and smaller desktop window sizes. Elements crowd, wrap poorly, or lose visual structure.

Expected:

Today should remain readable and usable across smaller desktop windows without obvious collisions or broken layout states.

Definition of done:

- Audit Today layout behavior across a set of smaller desktop window sizes.
- Add responsive adjustments for spacing, wrapping, and component stacking where needed.
- Preserve the primary daily workflow without forcing horizontal scroll or broken controls.
- Verify key Today interactions still work cleanly after responsive changes.

Context:

- `electron/index.html`
- `electron/renderer/app/today/`
- `electron/styles/today-carousel.css`
- `electron/styles/today-header.css`

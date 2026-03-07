# ISSUE-081: Add min/max bounds for Today progress chips

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

The Today progress chips do not enforce sensible numeric bounds. Users can enter values that are impossible or inconsistent with the current session state.

Expected:

Today progress chips should enforce valid minimum and maximum values so the UI prevents obviously invalid progress input.

Definition of done:

- Define valid bounds for page and percentage progress inputs.
- Enforce those bounds in the UI layer before save.
- Keep the saved state consistent when invalid values are attempted.
- Add regression coverage for lower-bound, upper-bound, and out-of-range entry.

Context:

- `electron/index.html`
- `electron/renderer/app/today/today_carousel_render.ts`
- `electron/renderer/app/today/today_carousel_progress.ts`

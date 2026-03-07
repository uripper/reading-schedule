# ISSUE-080: Fix Today progress chips placeholder editing

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

The Today progress chips behave like they contain real text instead of hint text. When a user tries to type a new value, the input appends onto the existing number instead of replacing it cleanly.

Expected:

Editing a Today progress chip should feel like editing a normal numeric field. The existing value should be easy to replace, and hint text should not behave like committed content.

Definition of done:

- Make the pages and percent progress chips behave like proper editable numeric inputs.
- Ensure typing replaces the current value predictably instead of appending onto display text.
- Keep keyboard, focus, and pointer behavior consistent across both chips.
- Add regression coverage for edit-open and first-keystroke behavior.

Context:

- `electron/index.html`
- `electron/renderer/app/today/today_carousel_render.ts`
- `electron/renderer/app/today/today_carousel_progress.ts`

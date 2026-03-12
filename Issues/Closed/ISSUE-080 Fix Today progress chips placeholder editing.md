# ISSUE-080: Fix Today progress chips placeholder editing

**Type:** bug
**Priority:** P1
**Labels:** `bug`, `ux`, `desktop`

Problem:

The Today progress chips behave like they contain real text instead of hint text. When a user tries to type a new value, the input appends onto the existing number instead of replacing it cleanly. The page and percent chips also do not keep their derived hint text synchronized while the user types, which makes it hard to understand how one edit maps to the other field.

Expected:

Editing a Today progress chip should feel like editing a normal numeric field. The existing value should be easy to replace, hint text should not behave like committed content, and the paired chip should immediately reflect the derived pages/percent hint as the user types.

Definition of done:

- Make the pages and percent progress chips behave like proper editable numeric inputs.
- Ensure typing replaces the current value predictably instead of appending onto display text.
- Typing percent progress immediately updates the derived pages hint text.
- Typing page progress immediately updates the derived percent hint text.
- Keep keyboard, focus, and pointer behavior consistent across both chips.
- Add regression coverage for edit-open and first-keystroke behavior.
- Add regression coverage for reciprocal pages/percent hint updates while editing.

Context:

- `electron/index.html`
- `electron/renderer/app/today/today_carousel_render.ts`
- `electron/renderer/app/today/today_carousel_progress.ts`

# ISSUE-044: Remove Tiny Start from Today screen

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

The Tiny Start option on the Today screen adds noise without clear value. It should be removed to simplify the primary reading action flow.

Expected:

The Tiny Start element is absent from the Today screen. The primary session action is the only call-to-action.

Definition of done:

- Remove the Tiny Start UI element and its associated logic from the Today screen.
- Verify no dead code or orphaned handlers remain.
- Update or remove tests that specifically cover Tiny Start behavior.

Context:

- Supersedes the Tiny Start path described in ISSUE-034.
- `electron/renderer/app/today.ts`
- `electron/index.html`

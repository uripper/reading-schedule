# ISSUE-020: Implement session-level notes, reflections, highlights, and tagging

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

The shared Session contract, snapshot validator, and session normalizer already preserve a plain notes string, but there is no session notes editor or structured reflections, highlights, and tags workflow. Extend this existing data rather than introducing a duplicate notes field.

Expected:

Users can add notes, reflections, highlights, and tags to each session, which are then viewable in session details and can be used for personal insights or exported (i.e. to Obsidian) for external use.

Definition of done:

- Reuse the existing `notes` field and extend the session data model for structured `reflections`, `highlights`, and `tags` as needed.
- Add UI components for users to input and view this information in session details.
- Ensure that this additional data is persisted and can be exported in session logs.
- Add tests for session data model extensions and UI interactions.

Context:

- `packages/contracts/src/types_subfolders/types_core.ts`
- `packages/contracts/src/state.ts`
- `packages/frontend/src/renderer/sessions/normalize.ts`
- `packages/frontend/src/renderer/calendar/`

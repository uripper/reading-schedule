# ISSUE-020: Implement session-level notes, reflections, highlights, and tagging


**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Current session tracking is limited to minutes and pages; there is no built-in way for users to capture qualitative reflections, notes, highlights, or tags associated with a reading session.

Expected:

Users can add notes, reflections, highlights, and tags to each session, which are then viewable in session details and can be used for personal insights or exported (i.e. to Obsidian) for external use.

Definition of done:

- Extend session data model to include `notes`, `reflections`, `highlights`, and `tags`.
- Add UI components for users to input and view this information in session details.
- Ensure that this additional data is persisted and can be exported in session logs.
- Add tests for session data model extensions and UI interactions.


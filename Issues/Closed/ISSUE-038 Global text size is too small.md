# ISSUE-038: Global text size is too small

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `accessibility`, `desktop`

Problem:

Text throughout the app is too small, reducing readability and general usability.

Expected:

Text sizes are increased to comfortable reading sizes across all screens.

Definition of done:

- Audit all font-size declarations across base.css and component styles.
- Increase body, label, and secondary text sizes to accessible minimums.
- Verify no layout breakage after size increases.
- Add visual regression notes for affected screens.

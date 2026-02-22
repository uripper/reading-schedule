# ISSUE-040: Add theme customization

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Users have no way to personalize the visual appearance of the app. Theme customization increases ownership and long-term retention.

Expected:

Users can select from a set of themes (e.g. light, dark, and at least one accent palette) via a settings surface. The chosen theme is persisted across sessions.

Definition of done:

- Define a CSS variable-based theming system in `base.css` or a dedicated `themes.css`.
- Implement at minimum: a default theme, a dark theme, and one accent variant.
- Wire theme selection to a setting stored in app state with migration support.
- Add a theme picker to the settings panel.
- Add tests for theme persistence and switching.

Context:

- `electron/styles/base.css`
- `electron/renderer/`

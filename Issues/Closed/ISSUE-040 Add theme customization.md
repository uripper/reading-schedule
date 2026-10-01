# ISSUE-040: Add theme customization

**Type:** enhancement
**Priority:** P3
**Labels:** `enhancement`, `ux`, `desktop`

Problem:

Users have no way to personalize the visual appearance of the app. The current visual system is effectively single-theme, which limits ownership and makes the product feel less intentional over long-term use.

Expected:

Users can select from a set of distinct curated themes via a settings surface. The chosen theme is persisted across sessions and applies consistently across the whole desktop experience.

Definition of done:

- Define a CSS variable-based theming system in `base.css` or a dedicated `themes.css`.
- Ship at minimum these theme families: Neo-Brutalism, Minimalism (user-facing label for Flat 2.0), and Bauhaus.
- Apply theme coverage across header, tab bar, cards, dialogs, forms, and empty states instead of only recoloring a subset of surfaces.
- Wire theme selection to a setting stored in app state with migration support.
- Add a theme picker to the settings panel with enough preview information for users to understand the visual differences.
- Add tests for theme persistence and switching.

Context:

- `electron/styles/base.css`
- `electron/styles/today-header.css`
- `electron/styles/settings.css`
- `electron/renderer/`

# ISSUE-115: Surface critical errors in-app instead of only Help/Logs

**Type:** enhancement
**Priority:** P1
**Labels:** `enhancement`, `ux`, `desktop`, `accessibility`

Problem:

Critical failures can still be effectively invisible unless the user manually opens Help/Logs. When a save, plan mutation, or similar high-friction action fails, users need immediate feedback in context rather than a silent failure plus a buried log line.

Expected:

Critical failures should show a reusable in-app error message surface with clear next steps, while Help/Logs remains available for deeper diagnostics.

Definition of done:

- Add a shared renderer error-message pattern for critical failures such as a persistent inline banner, dialog message area, or similarly visible surface.
- Use the shared pattern for Library add/edit save failures and the other highest-risk failure paths that currently rely on logs or transient status text.
- Ensure messages explain what failed, what the user can try next, and when opening Help/Logs would provide more detail.
- Preserve keyboard focus and screen-reader announcements for assertive errors.
- Add regression coverage for representative failure flows.

Context:

- `electron/renderer/books/dialog_submit.ts`
- `electron/renderer/help.ts`
- `electron/renderer/app/runtime_helpers.ts`
- `electron/renderer/app/plan_controller.ts`
- `electron/index.html`
- `electron/styles/dialogs.css`

# ISSUE-014: Integrate or remove orphaned session logging flow

**Type:** enhancement  
**Priority:** P2  
**Labels:** `enhancement`, `desktop`, `ux`

Problem:

Session logging subsystem exists but is not fully integrated into visible app workflow.

Expected:

Either expose session tracking clearly in UI navigation or remove unused paths.

Definition of done:

- Choose direction (integrate vs remove).
- Align stats/today behavior with chosen direction.
- Remove dead code if not integrated.

Context:

- `electron/renderer/sessions.ts`
- `electron/renderer/app.ts`
- `electron/renderer/stats/model.ts`

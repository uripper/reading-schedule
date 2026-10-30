# Critical error recovery

The shared frontend keeps persistence and planner errors in separate, persistent
alert regions above the active tab. Each error clears only when its own operation
recovers. Status updates from another operation do not dismiss an unresolved error.

`Retry save` flushes pending work through the existing serialized persistence queue
and collects the latest in-memory state. It does not repeat a book insertion or
re-run the planner. While a retry is pending, the control remains focusable and
uses `aria-disabled` to prevent duplicate submissions. If recovery removes the
focused control, focus moves to the main content. `Help/Logs` opens the existing
diagnostic dialog with its usual focus restoration.

Book-dialog submit errors have a dedicated alert area independent of lookup
metadata. Failed submissions keep the dialog and entered values available, restore
the save control, and retain keyboard focus. Validation errors still focus the
relevant invalid field. Closing and reopening a book dialog resets its submit error.

Planner generation and state persistence are distinct outcomes. A generated plan
can remain available in memory after persistence fails; that failure suppresses
the usual planner success status and announcement for that run. A successful save
retry clears the persistence error without rerunning generation.

## Contract and maintenance notes

- Reusable error contracts live in `packages/contracts`, alongside the persistence
  and planning contracts. Add reusable error sources there before wiring consumers.
- `PersistQueueArgs.onPersistResult` reports completed save attempts, including
  payload-collection failures. Existing callers may omit this optional callback.
- A `RunPlanGenerationArgs.onSuccess` callback may return a boolean save result.
  Returning `false` suppresses success feedback. Existing callbacks returning
  `Promise<void>` retain their previous behavior.
- Native persistence diagnostics remain in Help/Logs. Dialog save exceptions use
  the approved generic message in the dialog and retain diagnostic detail in logs.
- Regression tests cover queue recovery, current-state retries, concurrent attempts,
  scoped error clearing, focus behavior, and suppressed planner success feedback.

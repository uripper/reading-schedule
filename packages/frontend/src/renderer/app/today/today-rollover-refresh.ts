/**
 * Coordinates immediate UI refresh and safe replanning after a local-day change.
 */

// audit-allow-local-types: These callbacks are private renderer orchestration.
/** Actions required when the active local calendar day changes. */
interface LocalDayRolloverActions {
    /** Queues a planner run after the existing schedule has been rendered. */
    queueAutoPlan(): void;
    /** Renders the currently persisted schedule for the new active day. */
    renderCurrentSchedule(): void;
    /** Clears day-specific carousel interaction state. */
    resetTodayUi(): void;
    /** Refreshes Today and statistics dashboards. */
    updateDashboards(): void;
}

/**
 * Refreshes day-bound UI immediately, then queues a future-schedule replan.
 * @param actions - Bound renderer actions for rollover handling.
 */
export function refreshForLocalDayRollover(
    actions: LocalDayRolloverActions,
): void {
    actions.resetTodayUi();
    actions.renderCurrentSchedule();
    actions.updateDashboards();
    actions.queueAutoPlan();
}

import type {
    AddLog,
    DraftDataParams,
    PlannerApi,
    PlannerStateSnapshot,
} from "../../types/types.js";

/**
 * Builds the planner snapshot payload used for durable state persistence.
 * @param args Current runtime values and collectors needed for serialization.
 * @param args.sessions Current normalized reading sessions.
 * @param args.collectBooks Returns all books currently tracked by the app.
 * @param args.collectSettings Returns planner settings from UI controls.
 * @param args.preferences Current experience preferences.
 * @param args.featureFlags Current feature flag selections.
 * @param args.scheduleCompletions Completion map keyed by day/session identity.
 * @param args.blockedDayBooks Manually blocked day-book keys to keep out of replans.
 * @param args.lastResult Most recent planning result if one exists.
 * @returns Snapshot payload expected by planner state APIs.
 */
export function draftData(args: DraftDataParams): PlannerStateSnapshot {
    return {
        sessions: args.sessions,
        preferences: args.preferences,
        books: args.collectBooks(),
        settings: args.collectSettings(),
        feature_flags: args.featureFlags,
        schedule_completions: args.scheduleCompletions,
        blocked_day_books: args.blockedDayBooks,
        last_result: args.lastResult,
    };
}

/**
 * Attempts to save planner state and reports recoverable errors through log output.
 * @param plannerApi API adapter exposing persistence methods.
 * @param payload Snapshot payload to persist.
 * @param addLog Log sink for user-visible persistence failures.
 * @returns True when save succeeds, false when save fails.
 */
export async function saveStateSafe(
    plannerApi: Pick<PlannerApi, "saveState">,
    payload: PlannerStateSnapshot,
    addLog: AddLog,
): Promise<boolean> {
    try {
        const result = await plannerApi.saveState(payload);
        if (result.ok === false) {
            addLog(
                `Save failed: ${result.error ?? "Unknown state persistence error"}`,
            );
            return false;
        }
        return true;
    } catch {
        addLog("Save failed: unexpected state persistence error.");
        return false;
    }
}

import type {
    AddLog,
    DraftDataParams,
    PlannerApi,
    PlannerStateSnapshot,
} from "../../types/types.ts";

const CURRENT_STATE_VERSION = 1;

/**
 * Builds the planner snapshot payload used for durable state persistence.
 * @param args - Current runtime values and collectors needed for serialization.
 * @param sessions - Current normalized reading sessions.
 * @param collectBooks - Returns all books currently tracked by the app.
 * @param collectSettings - Returns planner settings from UI controls.
 * @param preferences - Current experience preferences.
 * @param featureFlags - Current feature flag selections.
 * @param scheduleCompletions - Completion map keyed by day/session identity.
 * @param blockedDayBooks - Manually blocked day-book keys to keep out of replans.
 * @param lastResult - Most recent planning result if one exists.
 * @returns Snapshot payload expected by planner state APIs.
 */
export function draftData(args: DraftDataParams): PlannerStateSnapshot {
    return {
        blocked_day_books: args.blockedDayBooks,
        books: args.collectBooks(),
        feature_flags: args.featureFlags,
        last_result: args.lastResult,
        preferences: args.preferences,
        schedule_completions: args.scheduleCompletions,
        sessions: args.sessions,
        settings: args.collectSettings(),
        state_version: CURRENT_STATE_VERSION,
    };
}

/**
 * Attempts to save planner state and reports recoverable errors through log output.
 * @param plannerApi - API adapter exposing persistence methods.
 * @param payload - Snapshot payload to persist.
 * @param addLog - Log sink for user-visible persistence failures.
 * @returns True when save succeeds, false when save fails.
 */
export async function saveStateSafe(
    plannerApi: Pick<PlannerApi, "saveState">,
    payload: PlannerStateSnapshot,
    addLog: AddLog,
): Promise<boolean> {
    try {
        const RESULT = await plannerApi.saveState(payload);
        if (RESULT.ok === false) {
            addLog(
                `Save failed: ${RESULT.error ?? "Unknown state persistence error"}`,
            );
            return false;
        }
        return true;
    } catch {
        addLog("Save failed: unexpected state persistence error.");
        return false;
    }
}

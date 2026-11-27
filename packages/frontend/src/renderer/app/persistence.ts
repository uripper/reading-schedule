import type {
    DraftDataParams,
    PlannerApi,
    PlannerStateSnapshot,
    SaveFeedback,
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
    const SNAPSHOT: PlannerStateSnapshot = {
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
    if (args.workspaceId !== undefined) {
        SNAPSHOT.workspace_id = args.workspaceId;
    }
    return SNAPSHOT;
}

/**
 * Attempts to save planner state and reports recoverable errors through log output.
 * @param plannerApi - API adapter exposing persistence methods.
 * @param payload - Snapshot payload to persist.
 * @param feedback - Log sink, plus a handler for saves the host refused.
 * @returns True when save succeeds, false when save fails.
 */
export async function saveStateSafe(
    plannerApi: Pick<PlannerApi, "saveState">,
    payload: PlannerStateSnapshot,
    feedback: SaveFeedback,
): Promise<boolean> {
    try {
        const RESULT = await plannerApi.saveState(payload);
        if (RESULT.ok === false) {
            const ERROR = RESULT.error ?? "Unknown state persistence error";
            feedback.addLog(`Save failed: ${ERROR}`);
            feedback.onRejected?.(ERROR);
            return false;
        }
        return true;
    } catch {
        feedback.addLog("Save failed: unexpected state persistence error.");
        return false;
    }
}

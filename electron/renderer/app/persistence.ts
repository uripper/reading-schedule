import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import type { FeatureFlags, Preferences } from "./experience/index.js";
import type {
  PlannerApi,
  PlannerResult,
  PlannerSettings,
  PlannerStateSnapshot,
} from "./types.js";

interface DraftDataParams {
  sessions: Session[];
  collectBooks(): Book[];
  collectSettings(): PlannerSettings;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

type AddLog = (message: string) => void;

/**
 * Builds the planner snapshot payload used for durable state persistence.
 * @param root0 Current runtime values and collectors needed for serialization.
 * @param root0.sessions Current normalized reading sessions.
 * @param root0.collectBooks Returns all books currently tracked by the app.
 * @param root0.collectSettings Returns planner settings from UI controls.
 * @param root0.preferences Current experience preferences.
 * @param root0.featureFlags Current feature flag selections.
 * @param root0.scheduleCompletions Completion map keyed by day/session identity.
 * @param root0.blockedDayBooks Manually blocked day-book keys to keep out of replans.
 * @param root0.lastResult Most recent planning result if one exists.
 * @returns Snapshot payload expected by planner state APIs.
 */
export function draftData({
  sessions,
  collectBooks,
  collectSettings,
  preferences,
  featureFlags,
  scheduleCompletions,
  blockedDayBooks,
  lastResult,
}: DraftDataParams): PlannerStateSnapshot {
  return {
    sessions,
    preferences,
    books: collectBooks(),
    settings: collectSettings(),
    feature_flags: featureFlags,
    schedule_completions: scheduleCompletions,
    blocked_day_books: blockedDayBooks,
    last_result: lastResult,
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

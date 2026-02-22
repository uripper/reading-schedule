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
  collectBooks: () => Book[];
  collectSettings: () => PlannerSettings;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

type AddLog = (message: string) => void;

export function draftData({
  sessions,
  collectBooks,
  collectSettings,
  preferences,
  featureFlags,
  scheduleCompletions,
  lastResult,
}: DraftDataParams): PlannerStateSnapshot {
  return {
    sessions,
    preferences,
    books: collectBooks(),
    settings: collectSettings(),
    feature_flags: featureFlags,
    schedule_completions: scheduleCompletions,
    last_result: lastResult,
  };
}

export async function saveStateSafe(
  plannerApi: Pick<PlannerApi, "saveState">,
  payload: PlannerStateSnapshot,
  addLog: AddLog,
): Promise<boolean> {
  try {
    const result = await plannerApi.saveState(payload);
    if (result.ok === false) {
      addLog(
        `Save failed: ${result.error || "Unknown state persistence error"}`,
      );
      return false;
    }
    return true;
  } catch {
    addLog("Save failed: unexpected state persistence error.");
    return false;
  }
}

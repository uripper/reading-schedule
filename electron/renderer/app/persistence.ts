

interface SessionsUI {
  getSessions: () => unknown[];
}

interface DraftDataParams {
  sessionsUI?: SessionsUI | null;
  collectBooks: () => unknown;
  collectSettings: () => unknown;
  preferences: unknown;
  featureFlags: unknown;
  scheduleCompletions: unknown;
  lastResult: unknown;
}

interface DraftDataPayload {
  sessions: unknown[];
  preferences: unknown;
  books: unknown;
  settings: unknown;
  feature_flags: unknown;
  schedule_completions: unknown;
  last_result: unknown;
}

interface SaveStateResult {
  ok?: boolean;
  error?: string;
}

interface PlannerApi {
  saveState: (payload: DraftDataPayload) => Promise<SaveStateResult>;
}

type AddLog = (message: string) => void;

export function draftData({
  sessionsUI,
  collectBooks,
  collectSettings,
  preferences,
  featureFlags,
  scheduleCompletions,
  lastResult,
}: DraftDataParams): DraftDataPayload {
  let sessions: unknown[] = [];
  if (sessionsUI) {
    sessions = sessionsUI.getSessions();
  }

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
  plannerApi: PlannerApi,
  payload: DraftDataPayload,
  addLog: AddLog,
): Promise<boolean> {
  try {
    const result = await plannerApi.saveState(payload);
    if (result?.ok === false) {
      addLog(`Save failed: ${result.error || "Unknown state persistence error"}`);
      return false;
    }
    return true;
  } catch (error: any) {
    addLog(`Save failed: ${error.message || error}`);
    return false;
  }
}

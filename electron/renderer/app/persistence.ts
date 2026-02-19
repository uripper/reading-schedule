

export function draftData({
  sessionsUI,
  collectBooks,
  collectSettings,
  preferences,
  featureFlags,
  scheduleCompletions,
  lastResult,
}) {
  let sessions = [];
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

export async function saveStateSafe(plannerApi, payload, addLog) {
  try {
    const result = await plannerApi.saveState(payload);
    if (result?.ok === false) {
      addLog(`Save failed: ${result.error || "Unknown state persistence error"}`);
      return false;
    }
    return true;
  } catch (error) {
    addLog(`Save failed: ${error.message || error}`);
    return false;
  }
}

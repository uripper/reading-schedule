// @ts-nocheck

export async function runPlanGeneration({
  plannerApi,
  collectBooks,
  collectSettings,
  setStatus,
  addLog,
  announce,
  onSuccess,
  statusGeneratingMessage = "Generating plan...",
  statusSuccessMessage = "Plan generated.",
  successAnnouncement = "Plan generated and schedule updated.",
}) {
  try {
    const payloadBooks = collectBooks();
    if (!payloadBooks.length) {
      return;
    }

    setStatus(statusGeneratingMessage);
    const payload = {
      planner: "mip",
      books: payloadBooks,
      settings: collectSettings(),
    };

    const data = await plannerApi.generate(payload);
    await onSuccess(data);

    if (data.summary.feasibility_warning) {
      addLog(data.summary.feasibility_warning);
    }
    addLog(`Status ${data.summary.status}. Planned ${data.summary.total_planned_minutes}/${data.summary.total_available_minutes} minutes.`);

    setStatus(statusSuccessMessage);
    if (successAnnouncement) {
      announce(successAnnouncement);
    }
  } catch (error) {
    setStatus(error.message || "Failed to generate plan", true);
    announce(error.message || "Failed to generate plan", "assertive");
  }
}

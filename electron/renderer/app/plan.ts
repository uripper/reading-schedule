// @ts-nocheck

export async function runPlanGeneration({
  plannerApi,
  collectBooks,
  collectSettings,
  setStatus,
  addLog,
  announce,
  onSuccess,
}) {
  try {
    const payloadBooks = collectBooks();
    if (!payloadBooks.length) {
      throw new Error("Add at least one book with pages or words before generating.");
    }

    setStatus("Generating plan...");
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

    setStatus("Plan generated.");
    announce("Plan generated and schedule updated.");
  } catch (error) {
    setStatus(error.message || "Failed to generate plan", true);
    announce(error.message || "Failed to generate plan", "assertive");
  }
}

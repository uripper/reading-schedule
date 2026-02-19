// @ts-nocheck
import { runPlanGeneration } from "./plan.js";
import { mergeScheduleRows, pruneScheduleCompletions } from "./schedule_preserve.js";

const AUTO_PLAN_DELAY_MS = 450;
const DEFAULT_LAST_RESULT = { schedule: [], summary: null, created_at: "" };

function hasRows(rows) {
  return Array.isArray(rows) && rows.length > 0;
}

function resultFromData(data) {
  return {
    schedule: data.schedule || [],
    summary: data.summary || null,
    created_at: new Date().toISOString(),
  };
}

export function createPlanController({
  plannerApi,
  collectBooks,
  collectSettings,
  setStatus,
  addLog,
  announce,
  getLastResult,
  setLastResult,
  getSessions,
  getScheduleCompletions,
  setScheduleCompletions,
  renderCalendar,
  totalsFromSummary,
  setBookScheduleRows,
  updateTodayView,
  persistDraft,
}) {
  let autoTimer = null;
  let autoRunPending = false;
  let autoRunInFlight = false;

  const applyPlannedData = async (data, preserveLockedDays) => {
    const previousRows = getLastResult()?.schedule || [];
    let nextRows = data.schedule || [];
    if (preserveLockedDays) {
      nextRows = mergeScheduleRows(previousRows, nextRows, getSessions());
    }

    const filteredCompletions = pruneScheduleCompletions(getScheduleCompletions(), nextRows);
    setScheduleCompletions(filteredCompletions);
    const nextResult = resultFromData({ ...data, schedule: nextRows });
    setLastResult(nextResult);
    setBookScheduleRows(nextRows);
    renderCalendar(nextRows, totalsFromSummary(nextResult.summary));
    updateTodayView();
    await persistDraft();
  };

  const runAutoPlan = async () => {
    if (autoRunInFlight) {
      autoRunPending = true;
      return;
    }

    autoRunInFlight = true;
    try {
      await runPlanGeneration({
        plannerApi,
        collectBooks,
        collectSettings,
        setStatus,
        addLog,
        announce,
        statusGeneratingMessage: "Updating plan...",
        statusSuccessMessage: "Plan updated.",
        successAnnouncement: "",
        onSuccess: async (data) => {
          await applyPlannedData(data, true);
        },
      });
    } finally {
      autoRunInFlight = false;
      if (autoRunPending) {
        autoRunPending = false;
        queueAutoPlan();
      }
    }
  };

  const queueAutoPlan = () => {
    if (autoTimer) {
      clearTimeout(autoTimer);
    }
    autoTimer = setTimeout(() => {
      void runAutoPlan();
    }, AUTO_PLAN_DELAY_MS);
  };

  const applyLoadedResult = (savedResult) => {
    if (!savedResult || !hasRows(savedResult.schedule)) {
      setLastResult(DEFAULT_LAST_RESULT);
      setBookScheduleRows([]);
      return;
    }
    setLastResult(savedResult);
    setBookScheduleRows(savedResult.schedule || []);
    renderCalendar(savedResult.schedule || [], totalsFromSummary(savedResult.summary));
    addLog("Loaded previous schedule.");
  };

  return {
    queueAutoPlan,
    applyLoadedResult,
  };
}

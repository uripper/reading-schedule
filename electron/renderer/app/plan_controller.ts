import type { Book } from '../books/types.js';
import type { Session } from '../sessions/normalize.js';
import { runPlanGeneration } from './plan.js';
import { mergeScheduleRows, pruneScheduleCompletions } from './schedule_preserve.js';
import type { PlannerApi, PlannerResult, PlannerScheduleRow, PlannerSettings, PlannerSummary } from './types.js';

const AUTO_PLAN_DELAY_MS = 450;
const DEFAULT_LAST_RESULT: PlannerResult = { schedule: [], summary: null, created_at: '' };

type PlanControllerArgs = {
  plannerApi: Pick<PlannerApi, 'generate'>;
  collectBooks: () => Book[];
  collectSettings: () => PlannerSettings;
  setStatus: (message: string, isError?: boolean) => void;
  addLog: (message: string) => void;
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
  getLastResult: () => PlannerResult | null;
  setLastResult: (result: PlannerResult) => void;
  getSessions: () => Session[];
  getScheduleCompletions: () => Record<string, boolean>;
  setScheduleCompletions: (completions: Record<string, boolean>) => void;
  renderCalendar: (rows: PlannerScheduleRow[], totals: Record<string, number>) => void;
  totalsFromSummary: (summary: PlannerSummary | null) => Record<string, number>;
  setBookScheduleRows: (rows: PlannerScheduleRow[]) => void;
  updateTodayView: () => void;
  persistDraft: () => Promise<boolean>;
};

type PlannerRunData = Pick<PlannerResult, 'schedule' | 'summary'>;

function hasRows(rows: PlannerScheduleRow[]): boolean {
  return Array.isArray(rows) && rows.length > 0;
}

function resultFromData(data: PlannerRunData): PlannerResult {
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
}: PlanControllerArgs) {
  let autoTimer: ReturnType<typeof setTimeout> | null = null;
  let autoRunPending = false;
  let autoRunInFlight = false;

  const applyPlannedData = async (data: PlannerRunData, preserveLockedDays: boolean) => {
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
        statusGeneratingMessage: 'Updating plan...',
        statusSuccessMessage: 'Plan updated.',
        successAnnouncement: '',
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
      runAutoPlan().catch((error) => {
        if (error) {
          addLog("Unexpected error during automatic plan refresh.");
        }
        addLog("Automatic plan refresh failed.");
        setStatus("Automatic plan refresh failed.", true);
      });
    }, AUTO_PLAN_DELAY_MS);
  };

  const applyLoadedResult = (savedResult: PlannerResult | null) => {
    if (!savedResult || !hasRows(savedResult.schedule)) {
      setLastResult(DEFAULT_LAST_RESULT);
      setBookScheduleRows([]);
      return;
    }
    setLastResult(savedResult);
    setBookScheduleRows(savedResult.schedule || []);
    renderCalendar(savedResult.schedule || [], totalsFromSummary(savedResult.summary));
    addLog('Loaded previous schedule.');
  };

  return {
    queueAutoPlan,
    applyLoadedResult,
  };
}

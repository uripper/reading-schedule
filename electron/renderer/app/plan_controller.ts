import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import { runPlanGeneration } from "./plan.js";
import {
  applyLoadedResult,
  applyPlannedData,
  type PlannerRunData,
} from "./plan_controller_apply.js";
import type {
  PlannerApi,
  PlannerResult,
  PlannerScheduleRow,
  PlannerSettings,
  PlannerSummary,
} from "./types.js";
const AUTO_PLAN_DELAY_MS = 450;
const DEFAULT_LAST_RESULT: PlannerResult = {
  schedule: [],
  summary: null,
  created_at: "",
};
interface PlanControllerArgs {
  plannerApi: Pick<PlannerApi, "generate">;
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  setStatus(this: void, message: string, isError?: boolean): void;
  addLog(this: void, message: string): void;
  announce(this: void, message: string, politeness?: "polite" | "assertive"): void;
  getLastResult(this: void): PlannerResult | null;
  setLastResult(this: void, result: PlannerResult): void;
  getSessions(this: void): Session[];
  getScheduleCompletions(this: void): Record<string, boolean>;
  getBlockedDayBooks(this: void): Record<string, boolean>;
  setScheduleCompletions(this: void, completions: Record<string, boolean>): void;
  renderCalendar(
    this: void,
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(this: void, summary: PlannerSummary | null): Record<string, number>;
  setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
  updateTodayView(this: void): void;
  persistDraft(this: void): Promise<boolean>;
}

interface PlanController {
  applyLoadedResult(savedResult: PlannerResult | null): void;
  queueAutoPlan(): void;
}

interface AutoPlanRunner {
  queueAutoPlan(): void;
}

interface AutoPlanState {
  autoRunPending: boolean;
  autoRunInFlight: boolean;
}

interface RunAutoPlanFactoryArgs extends PlanControllerArgs {
  state: AutoPlanState;
  scheduleAutoPlan(this: void, runner: () => Promise<void>): void;
}

/**
 * Builds the auto-plan execution loop used by the debounced runner.
 * @param root0 Auto-plan dependencies and mutable in-flight/pending state.
 * @returns Async auto-plan function.
 */
function createRunAutoPlan(root0: RunAutoPlanFactoryArgs): () => Promise<void> {
  const {
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
    getBlockedDayBooks,
    setScheduleCompletions,
    renderCalendar,
    totalsFromSummary,
    setBookScheduleRows,
    updateTodayView,
    persistDraft,
    state,
    scheduleAutoPlan,
  } = root0;
  const runAutoPlan = async (): Promise<void> => {
    if (state.autoRunInFlight) {
      state.autoRunPending = true;
      return;
    }
    state.autoRunInFlight = true;
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
        onSuccess: async (data: PlannerRunData): Promise<void> => {
          await applyPlannedData({
            data,
            preserveLockedDays: true,
            getLastResult,
            getSessions,
            getBlockedDayBooks,
            getScheduleCompletions,
            setScheduleCompletions,
            setLastResult,
            setBookScheduleRows,
            renderCalendar,
            totalsFromSummary,
            updateTodayView,
            persistDraft,
          });
        },
      });
    } finally {
      state.autoRunInFlight = false;
      if (state.autoRunPending) {
        state.autoRunPending = false;
        scheduleAutoPlan(runAutoPlan);
      }
    }
  };
  return runAutoPlan;
}

/**
 * Creates debounced auto-plan runner state and scheduling handlers.
 * @param root0 Plan-controller dependencies used during auto generation.
 * @returns Auto-plan queue handler.
 */
function createAutoPlanRunner(root0: PlanControllerArgs): AutoPlanRunner {
  const {
    addLog,
    setStatus,
  } = root0;
  let autoTimer: ReturnType<typeof setTimeout> | null = null;
  const state: AutoPlanState = {
    autoRunPending: false,
    autoRunInFlight: false,
  };
  const scheduleAutoPlan = (runner: () => Promise<void>): void => {
    if (autoTimer) {
      clearTimeout(autoTimer);
    }
    autoTimer = setTimeout((): void => {
      runner().catch((_: unknown): void => {
        addLog("Automatic plan refresh failed.");
        setStatus("Automatic plan refresh failed.", true);
      });
    }, AUTO_PLAN_DELAY_MS);
  };
  const runAutoPlan = createRunAutoPlan({
    ...root0,
    state,
    scheduleAutoPlan,
  });
  const queueAutoPlan = (): void => {
    scheduleAutoPlan(runAutoPlan);
  };
  return { queueAutoPlan };
}

/**
 * Creates plan controller actions for applying, loading, and auto-refreshing schedules.
 * @param root0 Dependencies and state accessors required by plan operations.
 * @param root0.plannerApi Planner adapter used to generate schedules.
 * @param root0.collectBooks Returns all books currently in the planner.
 * @param root0.collectSettings Returns planner settings from the UI.
 * @param root0.setStatus Publishes user-facing status messages.
 * @param root0.addLog Appends diagnostic messages to planner logs.
 * @param root0.announce Sends screen-reader announcements.
 * @param root0.getLastResult Returns the last generated schedule result.
 * @param root0.setLastResult Stores the latest planner result.
 * @param root0.getSessions Returns normalized reading sessions.
 * @param root0.getScheduleCompletions Returns completion state keyed by schedule row.
 * @param root0.getBlockedDayBooks Returns manually blocked day-book keys.
 * @param root0.setScheduleCompletions Replaces completion state after schedule changes.
 * @param root0.renderCalendar Renders schedule rows into the calendar view.
 * @param root0.totalsFromSummary Converts summary data into calendar totals.
 * @param root0.setBookScheduleRows Updates book-level schedule rows in runtime state.
 * @param root0.updateTodayView Re-renders the Today panel.
 * @param root0.persistDraft Persists current runtime state.
 * @returns Controller methods for queueing auto-plan and applying loaded results.
 */
export function createPlanController(root0: PlanControllerArgs): PlanController {
  const autoPlanRunner = createAutoPlanRunner(root0);
  const applySavedResult = (savedResult: PlannerResult | null): void => {
    applyLoadedResult({
      savedResult,
      defaultLastResult: DEFAULT_LAST_RESULT,
      setLastResult: root0.setLastResult,
      setBookScheduleRows: root0.setBookScheduleRows,
      renderCalendar: root0.renderCalendar,
      totalsFromSummary: root0.totalsFromSummary,
      addLog: root0.addLog,
    });
  };
  return {
    queueAutoPlan: (): void => {
      autoPlanRunner.queueAutoPlan();
    },
    applyLoadedResult: applySavedResult,
  };
}

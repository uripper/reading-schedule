import type {
    AnnouncePoliteness,
    AutoPlanRunner,
    AutoPlanState,
    Book,
    PlanController,
    PlanControllerArgs,
    PlannerApi,
    PlannerResult,
    PlannerRunData,
    PlannerScheduleRow,
    PlannerSettings,
    RunAutoPlanFactoryArgs,
    Session,
} from "../../types/types.js";
import { runPlanGeneration } from "./plan.js";
import {
    applyLoadedResult,
    applyPlannedData,
} from "./plan_controller_apply.js";

const AUTO_PLAN_DELAY_MS = 450;
const DEFAULT_LAST_RESULT: PlannerResult = {
    created_at: "",
    schedule: [],
    summary: null,
};

/**
 * Builds the auto-plan execution loop used by the debounced runner.
 * @param root0 - Auto-plan dependencies and mutable in-flight/pending state.
 * @returns Async auto-plan function.
 */
interface ExecuteAutoPlanArgs {
    addLog: (message: string) => void;
    announce: (msg: string, politeness?: AnnouncePoliteness) => void;
    collectBooks: () => Book[];
    collectSettings: () => PlannerSettings;
    onSuccess: (data: PlannerRunData) => Promise<void>;
    plannerApi: Pick<PlannerApi, "generate">;
    setStatus: (msg: string, isError?: boolean) => void;
}

/**
 * Executes a single auto-plan generation and applies the result.
 */
async function executeAutoPlan(args: ExecuteAutoPlanArgs): Promise<void> {
    await runPlanGeneration({
        addLog: args.addLog,
        announce: args.announce,
        collectBooks: args.collectBooks,
        collectSettings: args.collectSettings,
        onSuccess: args.onSuccess,
        plannerApi: args.plannerApi,
        setStatus: args.setStatus,
        statusGeneratingMessage: "Updating plan...",
        statusSuccessMessage: "Plan updated.",
        successAnnouncement: "",
    });
}

/**
 * Creates success handler for auto-plan generation.
 */
interface AutoPlanSuccessHandlerArgs {
    getBlockedDayBooks: () => Record<string, boolean>;
    getLastResult: () => PlannerResult | null;
    getScheduleCompletions: () => Record<string, boolean>;
    getSessions: () => Session[];
    persistDraft: () => Promise<boolean>;
    renderCalendar: (
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ) => void;
    setBookScheduleRows: (rows: PlannerScheduleRow[]) => void;
    setLastResult: (result: PlannerResult) => void;
    setScheduleCompletions: (completions: Record<string, boolean>) => void;
    totalsFromSummary: (
        summary: PlannerRunData["summary"],
    ) => Record<string, number>;
    updateTodayView: () => void;
}

/**
* Creates a handler that applies planned data from an auto-plan run to the app state.
* @example
* createAutoPlanSuccessHandler({ getSessions, persistDraft, setLastResult })
* (data: PlannerRunData) => Promise<void>
* @param {{AutoPlanSuccessHandlerArgs}} {{args}} - Configuration and callbacks used to apply planned data and update application state.
* @returns {{(data: PlannerRunData) => Promise<void>}} Returns an async handler that accepts planner run data and applies it (resolves to void).
**/
function createAutoPlanSuccessHandler(
    args: AutoPlanSuccessHandlerArgs,
): (data: PlannerRunData) => Promise<void> {
    return async (data: PlannerRunData): Promise<void> => {
        await applyPlannedData({
            data,
            getBlockedDayBooks: args.getBlockedDayBooks,
            getLastResult: args.getLastResult,
            getScheduleCompletions: args.getScheduleCompletions,
            getSessions: args.getSessions,
            persistDraft: args.persistDraft,
            preserveLockedDays: true,
            renderCalendar: args.renderCalendar,
            setBookScheduleRows: args.setBookScheduleRows,
            setLastResult: args.setLastResult,
            setScheduleCompletions: args.setScheduleCompletions,
            totalsFromSummary: args.totalsFromSummary,
            updateTodayView: args.updateTodayView,
        });
    };
}

/**
* Creates a runner for the automatic planning process that manages concurrency, triggers the planner, and schedules retries if a run is already in progress.
* @example
* createRunAutoPlan({ plannerApi, collectBooks, collectSettings, setStatus, addLog, announce, getLastResult, setLastResult, getSessions, getScheduleCompletions, getBlockedDayBooks, setScheduleCompletions, renderCalendar, totalsFromSummary, setBookScheduleRows, updateTodayView, persistDraft, state, scheduleAutoPlan })()
* Promise<void>
* @param {{RunAutoPlanFactoryArgs}} {{root0}} - Factory arguments required to create the auto-plan runner.
* @returns {{() => Promise<void>}} Returns a function that, when invoked, runs the auto-plan process and resolves once complete.
**/
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
    /**
    * Trigger an automatic plan execution, ensuring only one run executes at a time and queuing a pending run if called while another is in progress.
    * @example
    * sync()
    * // returns Promise<void>
    * @returns {Promise<void>} Resolves when the sync cycle completes; if a run is already in flight it marks a pending run and resolves immediately. 
    */
    const SELF: () => Promise<void> = async (): Promise<void> => {
        if (state.autoRunInFlight) {
            state.autoRunPending = true;
            return;
        }
        state.autoRunInFlight = true;
        try {
            await executeAutoPlan({
                addLog,
                announce,
                collectBooks,
                collectSettings,
                onSuccess: createAutoPlanSuccessHandler({
                    getBlockedDayBooks,
                    getLastResult,
                    getScheduleCompletions,
                    getSessions,
                    persistDraft,
                    renderCalendar,
                    setBookScheduleRows,
                    setLastResult,
                    setScheduleCompletions,
                    totalsFromSummary,
                    updateTodayView,
                }),
                plannerApi,
                setStatus,
            });
        } finally {
            state.autoRunInFlight = false;
            if (state.autoRunPending) {
                state.autoRunPending = false;
                scheduleAutoPlan(SELF);
            }
        }
    };
    return SELF;
}

/**
 * Creates debounced auto-plan runner state and scheduling handlers.
 * @param root0 - Plan-controller dependencies used during auto generation.
 * @returns Auto-plan queue handler.
 */
function createAutoPlanRunner(root0: PlanControllerArgs): AutoPlanRunner {
    const { addLog, setStatus } = root0;
    let autoTimer: ReturnType<typeof setTimeout> | null = null;
    const STATE: AutoPlanState = {
        autoRunInFlight: false,
        autoRunPending: false,
    };
    const SCHEDULE_AUTO_PLAN = (runner: () => Promise<void>): void => {
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
    const RUN_AUTO_PLAN = createRunAutoPlan({
        ...root0,
        scheduleAutoPlan: SCHEDULE_AUTO_PLAN,
        state: STATE,
    });
    const QUEUE_AUTO_PLAN = (): void => {
        SCHEDULE_AUTO_PLAN(RUN_AUTO_PLAN);
    };
    return { queueAutoPlan: QUEUE_AUTO_PLAN };
}

/**
 * Creates plan controller actions for applying, loading, and auto-refreshing schedules.
 * @param root0 - Dependencies and state accessors required by plan operations.
 * @param plannerApi - Planner adapter used to generate schedules.
 * @param collectBooks - Returns all books currently in the planner.
 * @param collectSettings - Returns planner settings from the UI.
 * @param setStatus - Publishes user-facing status messages.
 * @param addLog - Appends diagnostic messages to planner logs.
 * @param announce - Sends screen-reader announcements.
 * @param getLastResult - Returns the last generated schedule result.
 * @param setLastResult - Stores the latest planner result.
 * @param getSessions - Returns normalized reading sessions.
 * @param getScheduleCompletions - Returns completion state keyed by schedule row.
 * @param getBlockedDayBooks - Returns manually blocked day-book keys.
 * @param setScheduleCompletions - Replaces completion state after schedule changes.
 * @param renderCalendar - Renders schedule rows into the calendar view.
 * @param totalsFromSummary - Converts summary data into calendar totals.
 * @param setBookScheduleRows - Updates book-level schedule rows in runtime state.
 * @param updateTodayView - Re-renders the Today panel.
 * @param persistDraft - Persists current runtime state.
 * @returns Controller methods for queueing auto-plan and applying loaded results.
 */
export function createPlanController(
    root0: PlanControllerArgs,
): PlanController {
    const AUTO_PLAN_RUNNER = createAutoPlanRunner(root0);
    const APPLY_SAVED_RESULT = (savedResult: PlannerResult | null): void => {
        applyLoadedResult({
            addLog: root0.addLog,
            defaultLastResult: DEFAULT_LAST_RESULT,
            renderCalendar: root0.renderCalendar,
            savedResult,
            setBookScheduleRows: root0.setBookScheduleRows,
            setLastResult: root0.setLastResult,
            totalsFromSummary: root0.totalsFromSummary,
        });
    };
    return {
        applyLoadedResult: APPLY_SAVED_RESULT,
        queueAutoPlan: (): void => {
            AUTO_PLAN_RUNNER.queueAutoPlan();
        },
    };
}

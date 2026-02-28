import {
    type AutoPlanRunner,
    type AutoPlanState,
    type PlanController,
    type PlanControllerArgs,
    type PlannerResult,
    type PlannerRunData,
    type RunAutoPlanFactoryArgs,
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
 * @param root0 Auto-plan dependencies and mutable in-flight/pending state.
 * @returns Async auto-plan function.
 */
interface ExecuteAutoPlanArgs {
    addLog: (...args: unknown[]) => void;
    announce: (msg: string, politeness?: AnnouncePoliteness) => void;
    collectBooks: () => Book[];
    collectSettings: () => AppSettings;
    onSuccess: (data: PlannerRunData) => Promise<void>;
    plannerApi: PlannerAPI;
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
                onSuccess: async (data: PlannerRunData): Promise<void> => {
                    await applyPlannedData({
                        data,
                        getBlockedDayBooks,
                        getLastResult,
                        getScheduleCompletions,
                        getSessions,
                        persistDraft,
                        preserveLockedDays: true,
                        renderCalendar,
                        setBookScheduleRows,
                        setLastResult,
                        setScheduleCompletions,
                        totalsFromSummary,
                        updateTodayView,
                    });
                },
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
 * @param root0 Plan-controller dependencies used during auto generation.
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

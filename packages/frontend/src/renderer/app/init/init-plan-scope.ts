/**
 * Plans one workspace inside the All Workspaces view.
 *
 * The renderer holds every workspace merged, but each workspace plans with only its
 * own books, settings, schedule, completions, and manual exclusions, exactly as when
 * it is open alone. Results replace only that workspace's rows in the merged
 * schedule. Requests carry the workspace as their plan scope, so the native planner
 * lets workspaces plan side by side instead of cancelling each other.
 */
import type {
    AppBootstrapContext,
    PlanController,
    PlanControllerArgs,
    PlannerResult,
    PlannerScheduleRow,
    WorkspacePlanScope,
} from "../../../types/types.ts";
import { setBookScheduleRows } from "../../books/controller.ts";
import { renderCalendar } from "../../calendar.ts";
import { sortRowsByDateAndSession } from "../../calendar/utils.ts";
import { totalsFromSummary } from "../runtime_helpers.ts";
import { applyAppStateMutation } from "../state_mutations.ts";
import { createAppPlanControllerInstance } from "./init-helpers.ts";
import { planControllerArgs } from "./init-plan-controller.ts";

const KEY_SEPARATOR = "|";

/** Book id at the end of a completion key (`date|index|book` or `date|book`). */
function completionBookId(key: string): string {
    return key.slice(key.lastIndexOf(KEY_SEPARATOR) + 1);
}

/** Book id of a manual exclusion key (`date|book`). */
function exclusionBookId(key: string): string {
    return key.slice(key.indexOf(KEY_SEPARATOR) + 1);
}

/** Keeps the entries whose book the scope owns (or does not own). */
function entriesFor(
    record: Record<string, boolean>,
    bookIdOf: (key: string) => string,
    keep: (bookId: string) => boolean,
): Record<string, boolean> {
    return Object.fromEntries(
        Object.entries(record).filter(([KEY]) => keep(bookIdOf(KEY))),
    );
}

/** All rows of the merged schedule. */
function mergedRows(appContext: AppBootstrapContext): PlannerScheduleRow[] {
    return appContext.state.lastResult?.schedule ?? [];
}

/** The scope's share of the merged result, or null when nothing was planned yet. */
function scopedResult(
    appContext: AppBootstrapContext,
    scope: WorkspacePlanScope,
): PlannerResult | null {
    const RESULT = appContext.state.lastResult;
    if (RESULT === null) {
        return null;
    }
    const ROWS = RESULT.schedule.filter((row) => scope.ownsBook(row.book_id));
    return { ...RESULT, schedule: ROWS };
}

/** Replaces the scope's rows in the merged schedule with a new plan. */
function mergeScopedResult(
    appContext: AppBootstrapContext,
    scope: WorkspacePlanScope,
    next: PlannerResult,
): void {
    const OTHERS = mergedRows(appContext).filter(
        (row) => !scope.ownsBook(row.book_id),
    );
    applyAppStateMutation(appContext.state, {
        lastResult: {
            created_at: next.created_at,
            schedule: sortRowsByDateAndSession([...OTHERS, ...next.schedule]),
            summary: null,
        },
        type: "set_last_result",
    });
}

/** Replaces the scope's completions in the merged completion map. */
function mergeScopedCompletions(
    appContext: AppBootstrapContext,
    scope: WorkspacePlanScope,
    next: Record<string, boolean>,
): void {
    const OTHERS = entriesFor(
        appContext.state.scheduleCompletions,
        completionBookId,
        (bookId) => !scope.ownsBook(bookId),
    );
    applyAppStateMutation(appContext.state, {
        scheduleCompletions: { ...OTHERS, ...next },
        type: "set_schedule_completions",
    });
}

/** Reads and writes only the scope's share of the merged state. */
function scopedState(
    appContext: AppBootstrapContext,
    scope: WorkspacePlanScope,
): Partial<PlanControllerArgs> {
    return {
        getBlockedDayBooks: () =>
            entriesFor(
                appContext.state.blockedDayBooks,
                exclusionBookId,
                scope.ownsBook,
            ),
        getLastResult: () => scopedResult(appContext, scope),
        getScheduleCompletions: () =>
            entriesFor(
                appContext.state.scheduleCompletions,
                completionBookId,
                scope.ownsBook,
            ),
        setLastResult: (next: PlannerResult): void => {
            mergeScopedResult(appContext, scope, next);
        },
        setScheduleCompletions: (next: Record<string, boolean>): void => {
            mergeScopedCompletions(appContext, scope, next);
        },
    };
}

/** Renders and indexes the whole merged schedule after the scope's rows change. */
function mergedRendering(
    appContext: AppBootstrapContext,
): Partial<PlanControllerArgs> {
    return {
        renderCalendar: (): void => {
            renderCalendar(mergedRows(appContext), totalsFromSummary(null));
        },
        setBookScheduleRows: (): void => {
            setBookScheduleRows(mergedRows(appContext));
        },
    };
}

/**
 * Creates the plan controller of one workspace in the All Workspaces view.
 * @param appContext - Shared renderer context holding the merged state.
 * @param scope - The workspace's books and settings.
 * @returns A plan controller limited to that workspace.
 */
export function buildScopedPlanController(
    appContext: AppBootstrapContext,
    scope: WorkspacePlanScope,
): PlanController {
    const BASE = planControllerArgs(appContext);
    return createAppPlanControllerInstance({
        ...BASE,
        ...scopedState(appContext, scope),
        ...mergedRendering(appContext),
        collectBooks: () =>
            BASE.collectBooks().filter((book) => scope.ownsBook(book.book_id)),
        collectSettings: scope.settings,
        plannerApi: {
            ...appContext.plannerApi,
            generate: async (payload) =>
                await appContext.plannerApi.generate({
                    ...payload,
                    plan_scope: scope.workspaceId,
                }),
        },
    });
}

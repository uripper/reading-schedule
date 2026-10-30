/** Stages optional completed sessions in the same save as imported reading progress. */
import type {
    AppBootstrapContext,
    AppRuntimeState,
    PlannerScheduleRow,
    SyncImportChoice,
    SyncSessionImport,
    SyncSessionState,
} from "@reading-schedule/contracts";
import { SYNC_SESSION_MINUTES_SCHEMA } from "@reading-schedule/contracts";
import { emptyPlannerResult } from "../app/calendar_interactions/calendar_interactions_helpers.ts";
import { wordsPlannedForManualSession } from "../app/calendar_interactions/calendar_interactions_manual_helpers.ts";
import { nextSessionIndexForDate } from "../app/calendar_interactions/calendar_interactions_row_helpers.ts";
import { nextResultWithRows } from "../app/calendar_interactions/calendar-interactions-schedule-update-helpers.ts";
import { todayDayKey } from "../app/date_keys.ts";
import { totalsFromSummary } from "../app/runtime_helpers.ts";
import { setBookScheduleRows } from "../books/controller.ts";
import { dayBookCompletionKey, sessionKeyFor } from "../calendar/utils.ts";
import { renderCalendar } from "../calendar.ts";
import {
    applySyncSessionState,
    rollbackSyncSessions,
    syncSessionSnapshot,
} from "./session-state.ts";

/** Uses the same pace estimate and session identity as manually logged calendar reading. */
function completedRow(
    choice: SyncImportChoice,
    input: SyncSessionImport,
    rows: PlannerScheduleRow[],
): PlannerScheduleRow {
    const BOOK = input.books.find((book) => book.book_id === choice.bookId);
    if (BOOK === undefined) {
        throw new Error(
            "Could not find a synced book to record its reading session. Retry the sync.",
        );
    }
    const MINUTES = SYNC_SESSION_MINUTES_SCHEMA.parse(choice.sessionMinutes);
    const DATE = todayDayKey();
    return {
        book_id: BOOK.book_id,
        date: DATE,
        minutes: MINUTES,
        session_index: nextSessionIndexForDate(DATE, rows),
        title: BOOK.title,
        words_planned: wordsPlannedForManualSession({
            bookId: BOOK.book_id,
            difficulty: BOOK.difficulty,
            minutes: MINUTES,
            rows,
            settings: input.settings,
        }),
    };
}

/** Builds all rows before applying state, so invalid input cannot leave partial sessions. */
function sessionRows(
    state: SyncSessionState,
    input: SyncSessionImport,
): PlannerScheduleRow[] {
    const ROWS = [...(state.lastResult?.schedule ?? [])];
    const ADDED: PlannerScheduleRow[] = [];
    for (const CHOICE of input.choices) {
        const ROW = completedRow(CHOICE, input, ROWS);
        ROWS.push(ROW);
        ADDED.push(ROW);
    }
    return ADDED;
}

/** Refreshes calendar rows after a successful import or a rollback. */
export function renderSyncSessions(context: AppBootstrapContext): void {
    const RESULT = context.state.lastResult;
    setBookScheduleRows(RESULT?.schedule ?? []);
    renderCalendar(
        RESULT?.schedule ?? [],
        totalsFromSummary(RESULT?.summary ?? null),
    );
}

/** Adds completed sessions without increasing book progress a second time. */
export function stageSyncSessions(
    state: AppRuntimeState,
    input: SyncSessionImport,
): () => void {
    const ROWS = sessionRows(state, input);
    const BEFORE = syncSessionSnapshot(state);
    const COMPLETIONS = { ...BEFORE.scheduleCompletions };
    const BLOCKED = { ...BEFORE.blockedDayBooks };
    for (const ROW of ROWS) {
        COMPLETIONS[sessionKeyFor(ROW)] = true;
        const KEY = dayBookCompletionKey(ROW.date, ROW.book_id);
        COMPLETIONS[KEY] = true;
        delete BLOCKED[KEY];
    }
    applySyncSessionState(state, {
        blockedDayBooks: BLOCKED,
        lastResult: nextResultWithRows(
            BEFORE.lastResult ?? emptyPlannerResult(),
            [...(BEFORE.lastResult?.schedule ?? []), ...ROWS],
        ),
        scheduleCompletions: COMPLETIONS,
    });
    return (): void => {
        rollbackSyncSessions(state, BEFORE, ROWS);
    };
}

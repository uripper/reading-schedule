import type {
    CalendarHandlers,
    CompletedBookRow,
    PlannerScheduleRow,
} from "../types/types.ts";
import { renderCalendarDetails } from "./calendar/details.ts";
import {
    buildCompletedBookRowsByDate,
    finishedBooksSummaryText,
} from "./calendar/finished_books.ts";
import {
    refreshDerivedRows,
    renderControls,
    renderMonth,
} from "./calendar/render_runtime.ts";
import {
    applyTodayFocus,
    indexForMonth,
    monthKeyForDateKey,
    moveSelectionBy,
    selectDate,
} from "./calendar/selection.ts";
import {
    createCalendarRuntimeState,
    mergeCalendarHandlers,
} from "./calendar/state_runtime.ts";

const STATE = createCalendarRuntimeState();
let interactionHandlers: CalendarHandlers = mergeCalendarHandlers({});

/**
 * Removes any prior finished-books summary from details panel.
 * @param details - Day-details root node.
 */
function clearFinishedBooksSummary(details: HTMLElement): void {
    for (const NODE of details.querySelectorAll(".day-finished-summary")) {
        NODE.remove();
    }
}

/**
 * Renders top summary line listing books finished on selected day.
 * @param completedRows - Completed-book rows for selected date.
 */
function renderFinishedBooksSummary(completedRows: CompletedBookRow[]): void {
    const DETAILS = document.getElementById("calendarDayDetails");
    if (!(DETAILS instanceof HTMLElement)) {
        return;
    }
    clearFinishedBooksSummary(DETAILS);
    const SUMMARY_TEXT = finishedBooksSummaryText(completedRows);
    if (SUMMARY_TEXT === "") {
        return;
    }
    const SUMMARY = document.createElement("p");
    SUMMARY.className = "day-finished-summary";
    SUMMARY.textContent = SUMMARY_TEXT;
    const TITLE_NODE = DETAILS.querySelector("h2");
    if (TITLE_NODE instanceof HTMLElement) {
        TITLE_NODE.after(SUMMARY);
        return;
    }
    DETAILS.prepend(SUMMARY);
}

function completedBookRowsLookup(): Record<string, CompletedBookRow[]> {
    const GET_BOOK_BY_ID = (
        bookId: string,
    ): ReturnType<CalendarHandlers["getBookById"]> => {
        return interactionHandlers.getBookById(bookId);
    };
    return buildCompletedBookRowsByDate(
        interactionHandlers.listSessionBooks(),
        GET_BOOK_BY_ID,
    );
}

function completedBookRowsForDate() {
    const COMPLETED_ROWS_BY_DATE = completedBookRowsLookup();
    return (dateKey: string): CompletedBookRow[] => {
        return COMPLETED_ROWS_BY_DATE[dateKey] ?? [];
    };
}

function renderDetailsForDate(
    completedBookRowsForDate: (dateKey: string) => CompletedBookRow[],
): void {
    renderCalendarDetails(STATE, interactionHandlers, renderMonthView);
    renderFinishedBooksSummary(completedBookRowsForDate(STATE.selectedDate));
}

function renderMonthActions(
    completedBookRowsForDate: (dateKey: string) => CompletedBookRow[],
) {
    return {
        completedBookRowsForDate,
        moveSelectionBy: (delta: number, currentIndex: number) => {
            moveSelectionBy(STATE, delta, currentIndex, (dateKey, options) => {
                selectDate(STATE, dateKey, renderMonthView, options);
            });
        },
        renderDetails: () => {
            renderDetailsForDate(completedBookRowsForDate);
        },
        selectDate: (
            dateKey: string,
            options?: { preventScroll?: boolean },
        ) => {
            selectDate(STATE, dateKey, renderMonthView, options);
        },
    };
}

/**
 * Renders month grid and wires date selection/navigation callbacks.
 */
function renderMonthView(): void {
    refreshDerivedRows(STATE, interactionHandlers.isSessionCompleted);
    const COMPLETED_BOOK_ROWS_FOR_DATE = completedBookRowsForDate();
    renderMonth(STATE, renderMonthActions(COMPLETED_BOOK_ROWS_FOR_DATE));
}

/**
 * Renders calendar control bar and today-jump behavior.
 */
function renderControlsView(): void {
    const JUMP_TO_TODAY = (): void => {
        applyTodayFocus(STATE);
        renderControlsView();
        renderMonthView();
    };
    renderControls(STATE, renderControlsView, renderMonthView, JUMP_TO_TODAY);
}

function previousMonthKey(): string {
    return STATE.months[STATE.index] || "";
}

function restoreCalendarIndex(previousMonthKeyValue: string): void {
    STATE.index = 0;
    if (!previousMonthKeyValue) {
        return;
    }
    const PREVIOUS_MONTH_INDEX = STATE.months.indexOf(previousMonthKeyValue);
    if (PREVIOUS_MONTH_INDEX >= 0) {
        STATE.index = PREVIOUS_MONTH_INDEX;
    }
}

function restoreSelectedDate(previousSelectedDate: string): void {
    if (previousSelectedDate !== "" && previousSelectedDate in STATE.dates) {
        STATE.selectedDate = previousSelectedDate;
        return;
    }
    STATE.selectedDate = "";
}

function applyCalendarInputs(
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
): void {
    STATE.rawRows = [...rows];
    STATE.totalsByBookId = { ...totals };
    refreshDerivedRows(STATE, interactionHandlers.isSessionCompleted);
}

/**
 * Renders full calendar from schedule rows and per-book totals.
 * @param rows - Planner schedule rows.
 * @param totals - Book totals keyed by `book_id`.
 */
export function renderCalendar(
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
): void {
    const PREVIOUS_SELECTED_DATE = STATE.selectedDate;
    const PREVIOUS_MONTH_KEY = previousMonthKey();
    applyCalendarInputs(rows, totals);
    restoreCalendarIndex(PREVIOUS_MONTH_KEY);
    restoreSelectedDate(PREVIOUS_SELECTED_DATE);
    STATE.expectedFinishHighlightDate = "";
    if (!PREVIOUS_SELECTED_DATE) {
        applyTodayFocus(STATE);
    }
    renderControlsView();
    renderMonthView();
}

/**
 * Moves calendar focus to today and rerenders controls/month.
 */
export function focusCalendarToday(): void {
    if (!STATE.months.length) {
        return;
    }
    applyTodayFocus(STATE);
    renderControlsView();
    renderMonthView();
}

/**
 * Moves calendar focus to a specific day key and rerenders controls/month.
 * @param dateKey - Day key in `YYYY-MM-DD` format.
 */
export function focusCalendarDate(dateKey: string): void {
    if (!STATE.months.length) {
        return;
    }
    const MONTH_KEY = monthKeyForDateKey(dateKey);
    STATE.index = indexForMonth(STATE.months, MONTH_KEY);
    renderControlsView();
    selectDate(STATE, dateKey, renderMonthView);
}

/**
 * Configures interaction callbacks used by calendar details and actions.
 * @param handlers - Partial interaction handler overrides.
 */
export function configureCalendarInteractions(
    handlers: Partial<CalendarHandlers> = {},
): void {
    interactionHandlers = mergeCalendarHandlers(handlers);
}

import {
    type CalendarHandlers,
    type CompletedBookRow,
    type PlannerScheduleRow,
} from "../types/types.js";
import { renderCalendarDetails } from "./calendar/details.js";
import {
    buildCompletedBookRowsByDate,
    finishedBooksSummaryText,
} from "./calendar/finished_books.js";
import {
    refreshDerivedRows,
    renderControls,
    renderMonth,
} from "./calendar/render_runtime.js";
import {
    applyTodayFocus,
    indexForMonth,
    monthKeyForDateKey,
    moveSelectionBy,
    selectDate,
} from "./calendar/selection.js";
import {
    createCalendarRuntimeState,
    mergeCalendarHandlers,
} from "./calendar/state_runtime.js";

const STATE = createCalendarRuntimeState();
let interactionHandlers: CalendarHandlers = mergeCalendarHandlers({});

/**
 * Removes any prior finished-books summary from details panel.
 * @param details Day-details root node.
 */
function clearFinishedBooksSummary(details: HTMLElement): void {
    details.querySelectorAll(".day-finished-summary").forEach((node) => {
        node.remove();
    });
}

/**
 * Renders top summary line listing books finished on selected day.
 * @param completedRows Completed-book rows for selected date.
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

/**
 * Renders month grid and wires date selection/navigation callbacks.
 */
function renderMonthView(): void {
    refreshDerivedRows(STATE, interactionHandlers.isSessionCompleted);
    const GET_BOOK_BY_ID = (
        bookId: string,
    ): ReturnType<CalendarHandlers["getBookById"]> => {
        return interactionHandlers.getBookById(bookId);
    };
    const COMPLETED_ROWS_BY_DATE = buildCompletedBookRowsByDate(
        interactionHandlers.listSessionBooks(),
        GET_BOOK_BY_ID,
    );
    const COMPLETED_BOOK_ROWS_FOR_DATE = (
        dateKey: string,
    ): CompletedBookRow[] => {
        return COMPLETED_ROWS_BY_DATE[dateKey] ?? [];
    };
    renderMonth(STATE, {
        completedBookRowsForDate: COMPLETED_BOOK_ROWS_FOR_DATE,
        moveSelectionBy: (delta, currentIndex) => {
            moveSelectionBy(STATE, delta, currentIndex, (dateKey, options) => {
                selectDate(STATE, dateKey, renderMonthView, options);
            });
        },
        renderDetails: () => {
            renderCalendarDetails(STATE, interactionHandlers, renderMonthView);
            renderFinishedBooksSummary(
                COMPLETED_BOOK_ROWS_FOR_DATE(STATE.selectedDate),
            );
        },
        selectDate: (dateKey, options) => {
            selectDate(STATE, dateKey, renderMonthView, options);
        },
    });
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

/**
 * Renders full calendar from schedule rows and per-book totals.
 * @param rows Planner schedule rows.
 * @param totals Book totals keyed by `book_id`.
 */
export function renderCalendar(
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
): void {
    const PREVIOUS_SELECTED_DATE = STATE.selectedDate;
    const PREVIOUS_MONTH_KEY = STATE.months[STATE.index] || "";
    STATE.rawRows = [...rows];
    STATE.totalsByBookId = { ...totals };
    refreshDerivedRows(STATE, interactionHandlers.isSessionCompleted);
    STATE.index = 0;
    if (PREVIOUS_MONTH_KEY) {
        const PREVIOUS_MONTH_INDEX = STATE.months.indexOf(PREVIOUS_MONTH_KEY);
        if (PREVIOUS_MONTH_INDEX >= 0) {
            STATE.index = PREVIOUS_MONTH_INDEX;
        }
    }
    if (
        PREVIOUS_SELECTED_DATE !== "" &&
        PREVIOUS_SELECTED_DATE in STATE.dates
    ) {
        STATE.selectedDate = PREVIOUS_SELECTED_DATE;
    } else {
        STATE.selectedDate = "";
    }
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
 * @param dateKey Day key in `YYYY-MM-DD` format.
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
 * @param handlers Partial interaction handler overrides.
 */
export function configureCalendarInteractions(
    handlers: Partial<CalendarHandlers> = {},
): void {
    interactionHandlers = mergeCalendarHandlers(handlers);
}

export { firstPlannedRow } from "./calendar/data.js";

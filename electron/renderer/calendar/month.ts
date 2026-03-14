import type {
    CalendarDisplayRow,
    CalendarState,
    MonthActions,
} from "../../types/types.ts";
import { el } from "../dom.ts";
import { createDayButton, createWeekdayHeader } from "./month_day_button.ts";
import { handleDayKeydown } from "./month_keyboard.ts";
import { dayKey, monthCells, monthLabel } from "./utils.ts";

/**
 * Returns today's local day key for month rendering state checks.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDayKey(): string {
    return dayKey(new Date());
}

function validBookId(bookId: unknown): string {
    if (typeof bookId !== "string") {
        return "";
    }
    return bookId;
}

function completedRowsByBookId(
    completedBookRows: CalendarDisplayRow[],
): Map<string, CalendarDisplayRow> {
    const COMPLETED_BY_BOOK_ID = new Map<string, CalendarDisplayRow>();
    for (const ROW of completedBookRows) {
        const BOOK_ID = validBookId(ROW.book_id);
        if (BOOK_ID === "" || COMPLETED_BY_BOOK_ID.has(BOOK_ID)) {
            continue;
        }
        COMPLETED_BY_BOOK_ID.set(BOOK_ID, ROW);
    }
    return COMPLETED_BY_BOOK_ID;
}

function finishFirstRows(rows: CalendarDisplayRow[]): CalendarDisplayRow[] {
    const FINISH_ROWS: CalendarDisplayRow[] = [];
    const OTHER_ROWS: CalendarDisplayRow[] = [];
    for (const ROW of rows) {
        if (ROW.finish === true) {
            FINISH_ROWS.push(ROW);
            continue;
        }
        OTHER_ROWS.push(ROW);
    }
    return [...FINISH_ROWS, ...OTHER_ROWS];
}

function missingCompletedRows(
    completedByBookId: Map<string, CalendarDisplayRow>,
    seenBookIds: Set<string>,
): CalendarDisplayRow[] {
    const MISSING_COMPLETED_ROWS: CalendarDisplayRow[] = [];
    for (const [BOOK_ID, ROW] of completedByBookId.entries()) {
        if (seenBookIds.has(BOOK_ID)) {
            continue;
        }
        MISSING_COMPLETED_ROWS.push(ROW);
    }
    return MISSING_COMPLETED_ROWS;
}

/**
 * Adds finish rows for books completed on this date without scheduled sessions.
 * @param plannedRows - Existing scheduled rows for the date.
 * @param completedBookRows - Synthetic completed-book rows.
 * @returns Combined rows for month-grid display.
 */
function mergeDisplayRows(
    plannedRows: CalendarDisplayRow[],
    completedBookRows: CalendarDisplayRow[],
): CalendarDisplayRow[] {
    const COMPLETED_BY_BOOK_ID = completedRowsByBookId(completedBookRows);
    const PROCESSED_ROWS = processReadingRows(
        plannedRows,
        COMPLETED_BY_BOOK_ID,
    );
    return finishFirstRows([
        ...PROCESSED_ROWS.Out,
        ...missingCompletedRows(
            COMPLETED_BY_BOOK_ID,
            PROCESSED_ROWS.SeenBookIds,
        ),
    ]);
}

/**
 * Mark planned calendar rows as finished when a corresponding completed row exists and collect seen book ids.
 * @example
 * processReadingRows(plannedRows, completedByBookId)
 * { Out: [/* CalendarDisplayRow objects, some with finish: true */
function processedReadingRow(
    row: CalendarDisplayRow,
    completedByBookId: Map<string, CalendarDisplayRow>,
): { bookId: string; row: CalendarDisplayRow } {
    const BOOK_ID = validBookId(row.book_id);
    if (BOOK_ID === "" || !completedByBookId.has(BOOK_ID)) {
        return { bookId: BOOK_ID, row };
    }
    return {
        bookId: BOOK_ID,
        row: {
            ...row,
            finish: true,
        },
    };
}

function trackSeenBook(seenBookIds: Set<string>, bookId: string): void {
    if (bookId === "") {
        return;
    }
    seenBookIds.add(bookId);
}

function processReadingRows(
    plannedRows: CalendarDisplayRow[],
    completedByBookId: Map<string, CalendarDisplayRow>,
) {
    const Out: CalendarDisplayRow[] = [];
    const SeenBookIds = new Set<string>();

    for (const ROW of plannedRows) {
        const PROCESSED_ROW = processedReadingRow(ROW, completedByBookId);
        Out.push(PROCESSED_ROW.row);
        trackSeenBook(SeenBookIds, PROCESSED_ROW.bookId);
    }
    return { Out, SeenBookIds };
}

/**
 * Ensures selected date is within current month cell range.
 * Defaults to first populated day, then first visible cell.
 * @param state - Mutable calendar render state.
 */
function ensureSelectedDateInMonth(state: CalendarState): void {
    const CALENDAR_STATE = state;
    if (
        CALENDAR_STATE.selectedDate === "" ||
        !CALENDAR_STATE.monthCellKeys.includes(CALENDAR_STATE.selectedDate)
    ) {
        const FIRST_WITH_ROWS = CALENDAR_STATE.monthCellKeys.find((cellKey) => {
            if (!(cellKey in CALENDAR_STATE.dates)) {
                return false;
            }
            return CALENDAR_STATE.dates[cellKey].length > 0;
        });
        CALENDAR_STATE.selectedDate =
            FIRST_WITH_ROWS ?? CALENDAR_STATE.monthCellKeys[0];
    }
}

function emptyCalendarMonth(
    calendar: HTMLElement,
    state: CalendarState,
    actions: MonthActions,
): void {
    const CALENDAR_STATE = state;
    const EMPTY = document.createElement("p");
    EMPTY.className = "hint-text";
    EMPTY.textContent = "No schedule yet.";
    calendar.replaceChildren(EMPTY);
    CALENDAR_STATE.monthCellKeys = [];
    actions.renderDetails();
}

function monthGrid(monthKey: string): HTMLDivElement {
    const GRID = document.createElement("div");
    GRID.className = "calendar-grid";
    GRID.setAttribute("role", "grid");
    GRID.setAttribute("aria-label", `Schedule for ${monthLabel(monthKey)}`);
    return GRID;
}

function monthContext(monthKey: string): {
    cells: Date[];
    firstDate: Date;
} {
    const [YEAR, MONTH] = monthKey.split("-").map(Number);
    return {
        cells: monthCells(monthKey),
        firstDate: new Date(YEAR, MONTH - 1, 1),
    };
}

function applyMonthCellKeys(state: CalendarState, cells: Date[]): void {
    const CALENDAR_STATE = state;
    CALENDAR_STATE.monthCellKeys = cells.map((date) => dayKey(date));
}

function renderMonthKey(options: {
    actions: MonthActions;
    calendar: HTMLElement;
    calendarState: CalendarState;
    monthKey: string;
}): void {
    const MONTH_CONTEXT = monthContext(options.monthKey);
    applyMonthCellKeys(options.calendarState, MONTH_CONTEXT.cells);
    ensureSelectedDateInMonth(options.calendarState);
    renderCalendarCells({
        actions: options.actions,
        calendar: options.calendar,
        calendarState: options.calendarState,
        cells: MONTH_CONTEXT.cells,
        firstDate: MONTH_CONTEXT.firstDate,
        grid: monthGrid(options.monthKey),
        moveSelectionBy: options.actions.moveSelectionBy,
        todayKey: todayDayKey(),
    });
}

/**
 * Renders month grid, day buttons, and keyboard interactions.
 * @param state - Calendar render state.
 * @param actions - Month interaction callbacks.
 * @param actions.selectDate - Date selection callback.
 * @param actions.moveSelectionBy - Keyboard/grid movement callback.
 * @param actions.renderDetails - Details rerender callback.
 */
export function renderCalendarMonth(
    state: CalendarState,
    actions: MonthActions,
): void {
    const MONTH_KEY = state.months[state.index];
    const CALENDAR = el("calendar");
    if (!MONTH_KEY) {
        emptyCalendarMonth(CALENDAR, state, actions);
        return;
    }
    renderMonthKey({
        actions,
        calendar: CALENDAR,
        calendarState: state,
        monthKey: MONTH_KEY,
    });
}

interface RenderCalendarCellsArgs {
    actions: MonthActions;
    calendar: HTMLElement;
    calendarState: CalendarState;
    cells: Date[];
    firstDate: Date;
    grid: HTMLDivElement;
    moveSelectionBy: (delta: number, currentIndex: number) => void;
    todayKey: string;
}

function rowsForDay(
    args: RenderCalendarCellsArgs,
    keyForDay: string,
): CalendarDisplayRow[] {
    const PLANNED_ROWS = args.calendarState.dates[keyForDay] ?? [];
    return mergeDisplayRows(
        PLANNED_ROWS,
        args.actions.completedBookRowsForDate(keyForDay),
    );
}

function bindDayButtonActions(options: {
    actions: MonthActions;
    button: HTMLButtonElement;
    currentIndex: number;
    keyForDay: string;
    monthCellCount: number;
    moveSelectionBy: (delta: number, currentIndex: number) => void;
}): void {
    const BUTTON = options.button;
    BUTTON.onclick = () => {
        options.actions.selectDate(options.keyForDay);
    };
    BUTTON.onkeydown = (event) => {
        handleDayKeydown({
            event,
            index: options.currentIndex,
            moveSelectionBy: options.moveSelectionBy,
            totalCellCount: options.monthCellCount,
        });
    };
}

function dayButtonElement(options: {
    args: RenderCalendarCellsArgs;
    date: Date;
    keyForDay: string;
}): HTMLButtonElement {
    return createDayButton({
        date: options.date,
        firstDate: options.args.firstDate,
        keyForDay: options.keyForDay,
        rows: rowsForDay(options.args, options.keyForDay),
        selectedDate: options.args.calendarState.selectedDate,
        todayKey: options.args.todayKey,
    });
}

function calendarDayButton(options: {
    args: RenderCalendarCellsArgs;
    date: Date;
    index: number;
}): HTMLButtonElement {
    const KEY_FOR_DAY = options.args.calendarState.monthCellKeys[options.index];
    const DAY_BUTTON = dayButtonElement({
        args: options.args,
        date: options.date,
        keyForDay: KEY_FOR_DAY,
    });
    bindDayButtonActions({
        actions: options.args.actions,
        button: DAY_BUTTON,
        currentIndex: options.index,
        keyForDay: KEY_FOR_DAY,
        monthCellCount: options.args.calendarState.monthCellKeys.length,
        moveSelectionBy: options.args.moveSelectionBy,
    });
    return DAY_BUTTON;
}

function calendarDayButtons(
    args: RenderCalendarCellsArgs,
): HTMLButtonElement[] {
    return args.cells.map((date, index) => {
        return calendarDayButton({ args, date, index });
    });
}

/**
 * Renders day cells for a calendar month into the provided grid, attaches click and keyboard handlers, and updates the calendar DOM and details pane.
 * @example
 * renderCalendarCells({
 *   cells: [new Date(2026,0,1), new Date(2026,0,2)],
 *   firstDate: new Date(2026,0,1),
 *   calendarState: { monthCellKeys: ['2026-01-01','2026-01-02'], dates: {}, selectedDate: '2026-01-01' },
 *   todayKey: '2026-01-01',
 *   grid: document.createElement('div'),
 *   calendar: document.querySelector('.calendar'),
 *   actions: {
 *     completedBookRowsForDate: (key) => [],
 *     selectDate: (key) => {},
 *     renderDetails: () => {}
 *   },
 *   moveSelectionBy: (n) => {}
 * })
 * undefined
 * @param args - Arguments object containing cells, calendar state, DOM elements and action callbacks required to render the month.
 * @returns Does not return a value; performs DOM updates and triggers side effects.
 */
function renderCalendarCells(args: RenderCalendarCellsArgs): void {
    const DAY_BUTTONS = calendarDayButtons(args);
    args.grid.append(...DAY_BUTTONS);
    args.calendar.replaceChildren(...createWeekdayHeader(), args.grid);
    args.actions.renderDetails();
}

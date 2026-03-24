/** Renders the month-grid calendar view with finish-state decorations. */
import type {
    CalendarDisplayRow,
    CalendarState,
    MonthActions,
} from "../../types/types.ts";
import { el } from "../dom.ts";
import { createDayButton, createWeekdayHeader } from "./month_day_button.ts";
import { handleDayKeydown } from "./month_keyboard.ts";
import { mergeDisplayRows } from "./month-rows.ts";
import { dayKey, monthCells, monthLabel } from "./utils.ts";

/**
 * Returns today's local day key for month rendering state checks.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDayKey(): string {
    return dayKey(new Date());
}

/**
 * Ensures selected date is within current month cell range.
 * Defaults to first populated day, then first visible cell, only when a date
 * is already selected.
 * @param state - Mutable calendar render state.
 */
function ensureSelectedDateInMonth(state: CalendarState): void {
    const CALENDAR_STATE = state;
    if (CALENDAR_STATE.selectedDate === "") {
        return;
    }
    if (CALENDAR_STATE.monthCellKeys.includes(CALENDAR_STATE.selectedDate)) {
        return;
    }
    const FIRST_WITH_ROWS = CALENDAR_STATE.monthCellKeys.find((cellKey) => {
        if (!(cellKey in CALENDAR_STATE.dates)) {
            return false;
        }
        return CALENDAR_STATE.dates[cellKey].length > 0;
    });
    CALENDAR_STATE.selectedDate =
        FIRST_WITH_ROWS ?? CALENDAR_STATE.monthCellKeys[0];
}

/**
 * Replaces the calendar grid with an empty-state message and refreshes details.
 * @param calendar - Calendar root element.
 * @param state - Mutable calendar render state.
 * @param actions - Month interaction callbacks.
 */
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

/**
 * Creates the month grid container with its ARIA label.
 * @param monthKey - Visible month key in `YYYY-MM` format.
 * @returns Grid element used for day buttons.
 */
function monthGrid(monthKey: string): HTMLDivElement {
    const GRID = document.createElement("div");
    GRID.className = "calendar-grid";
    GRID.setAttribute("role", "grid");
    GRID.setAttribute("aria-label", `Schedule for ${monthLabel(monthKey)}`);
    return GRID;
}

/**
 * Builds the visible cell list and first-of-month date for the requested month.
 * @param monthKey - Visible month key in `YYYY-MM` format.
 * @returns Visible month cell dates and the month's first date.
 */
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

/**
 * Stores the current month-cell keys on the mutable calendar state.
 * @param state - Mutable calendar render state.
 * @param cells - Visible month cell dates.
 */
function applyMonthCellKeys(state: CalendarState, cells: Date[]): void {
    const CALENDAR_STATE = state;
    CALENDAR_STATE.monthCellKeys = cells.map((date) => dayKey(date));
}

/**
 * Prepares derived month state and renders the visible month grid.
 * @param options - Rendering inputs for the visible month.
 */
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

/**
 * Arguments required to render every button in the current month grid.
 */
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

/**
 * Resolves display rows for one day, including synthetic completion-only rows.
 * @param args - Month render context.
 * @param keyForDay - Day key for the cell being rendered.
 * @returns Display rows for the target day.
 */
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

/**
 * Wires click and keyboard handlers onto a rendered day button.
 * @param options - Day button bindings and navigation context.
 */
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

/**
 * Creates the button element for a single visible day cell.
 * @param options - Render inputs for the day button.
 * @returns Button element for the requested day.
 */
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

/**
 * Builds and binds a rendered day button for the month grid.
 * @param options - Render inputs for one visible day.
 * @returns Bound day button element.
 */
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

/**
 * Builds every day button needed for the current visible month.
 * @param args - Month render context.
 * @returns Day buttons in grid order.
 */
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

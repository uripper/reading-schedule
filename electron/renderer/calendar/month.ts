import type {
    CalendarDisplayRow,
    CalendarState,
    MonthActions,
} from "../../types/types.js";
import { el } from "../dom.js";
import { createDayButton, createWeekdayHeader } from "./month_day_button.js";
import { handleDayKeydown } from "./month_keyboard.js";
import { dayKey, monthCells, monthLabel } from "./utils.js";

/**
 * Returns today's local day key for month rendering state checks.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDayKey(): string {
    return dayKey(new Date());
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
    const COMPLETED_BY_BOOK_ID = new Map<string, CalendarDisplayRow>();

    for (const ROW of completedBookRows) {
        if (typeof ROW.book_id !== "string" || ROW.book_id === "") {
            continue;
        }
        if (COMPLETED_BY_BOOK_ID.has(ROW.book_id)) {
            continue;
        }
        COMPLETED_BY_BOOK_ID.set(ROW.book_id, ROW);
    }
    const {
        SeenBookIds,
        Out,
    }: { SeenBookIds: Set<string>; Out: CalendarDisplayRow[] } =
        processReadingRows(plannedRows, COMPLETED_BY_BOOK_ID);

    for (const [BOOK_ID, ROW] of COMPLETED_BY_BOOK_ID.entries()) {
        if (SeenBookIds.has(BOOK_ID)) {
            continue;
        }
        SeenBookIds.add(BOOK_ID);
        Out.push(ROW);
    }
    const FINISH_ROWS: CalendarDisplayRow[] = [];
    const OTHER_ROWS: CalendarDisplayRow[] = [];

    for (const ROW of Out) {
        if (ROW.finish === true) {
            FINISH_ROWS.push(ROW);
            continue;
        }
        OTHER_ROWS.push(ROW);
    }
    return [...FINISH_ROWS, ...OTHER_ROWS];
}

function processReadingRows(
    plannedRows: CalendarDisplayRow[],
    completedByBookId: Map<string, CalendarDisplayRow>,
) {
    const Out: CalendarDisplayRow[] = [];
    const SeenBookIds = new Set<string>();

    for (const ROW of plannedRows) {
        if (typeof ROW.book_id !== "string" || ROW.book_id === "") {
            Out.push(ROW);
            continue;
        }
        if (completedByBookId.has(ROW.book_id)) {
            Out.push({
                ...ROW,
                finish: true,
            });
            SeenBookIds.add(ROW.book_id);
            continue;
        }
        Out.push(ROW);
        SeenBookIds.add(ROW.book_id);
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
    const CALENDAR_STATE = state;
    const MOVE_SELECTION_BY = (delta: number, currentIndex: number): void => {
        actions.moveSelectionBy(delta, currentIndex);
    };
    const MONTH_KEY = CALENDAR_STATE.months[CALENDAR_STATE.index];
    const CALENDAR = el("calendar");
    if (!MONTH_KEY) {
        const EMPTY = document.createElement("p");
        EMPTY.className = "hint-text";
        EMPTY.textContent = "No schedule yet.";
        CALENDAR.replaceChildren(EMPTY);
        CALENDAR_STATE.monthCellKeys = [];
        actions.renderDetails();
        return;
    }

    const [YEAR, MONTH] = MONTH_KEY.split("-").map(Number);
    const FIRST_DATE = new Date(YEAR, MONTH - 1, 1);
    const CELLS = monthCells(MONTH_KEY);
    CALENDAR_STATE.monthCellKeys = CELLS.map((date) => dayKey(date));
    ensureSelectedDateInMonth(CALENDAR_STATE);

    const GRID = document.createElement("div");
    GRID.className = "calendar-grid";
    GRID.setAttribute("role", "grid");
    GRID.setAttribute("aria-label", `Schedule for ${monthLabel(MONTH_KEY)}`);
    const TODAY_KEY = todayDayKey();

    renderCalendarCells({
        actions,
        calendar: CALENDAR,
        calendarState: CALENDAR_STATE,
        cells: CELLS,
        firstDate: FIRST_DATE,
        grid: GRID,
        moveSelectionBy: MOVE_SELECTION_BY,
        todayKey: TODAY_KEY,
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

function renderCalendarCells(args: RenderCalendarCellsArgs): void {
    args.cells.forEach((date, index) => {
        const KEY_FOR_DAY = args.calendarState.monthCellKeys[index];
        const COMPLETED_BOOK_ROWS =
            args.actions.completedBookRowsForDate(KEY_FOR_DAY);
        let rows: CalendarDisplayRow[] = [];
        if (KEY_FOR_DAY in args.calendarState.dates) {
            rows = args.calendarState.dates[KEY_FOR_DAY];
        }
        const DISPLAY_ROWS = mergeDisplayRows(rows, COMPLETED_BOOK_ROWS);
        const DAY_BUTTON = createDayButton({
            date,
            firstDate: args.firstDate,
            keyForDay: KEY_FOR_DAY,
            rows: DISPLAY_ROWS,
            selectedDate: args.calendarState.selectedDate,
            todayKey: args.todayKey,
        });
        DAY_BUTTON.onclick = () => {
            args.actions.selectDate(KEY_FOR_DAY);
        };
        DAY_BUTTON.onkeydown = (event) => {
            handleDayKeydown(
                event,
                index,
                args.calendarState.monthCellKeys.length,
                args.moveSelectionBy,
            );
        };
        args.grid.append(DAY_BUTTON);
    });

    args.calendar.replaceChildren(...createWeekdayHeader(), args.grid);
    args.actions.renderDetails();
}

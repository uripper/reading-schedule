import type {
    CalendarDetailsState,
    DetailInteractionHandlers,
} from "../../types/types.js";
import { el } from "../dom.js";
import { buildManualSessionAddPanel, dayMode } from "./details_helpers.js";
import { emptyMessageForMode, rowsForMode } from "./details_render_helpers.js";
import { dateHeading } from "./utils.js";

interface ManualAddPanelArgs {
    defaults: ReturnType<typeof defaultManualAddValues>;
    interactionHandlers: DetailInteractionHandlers;
    key: string;
    mode: ReturnType<typeof dayMode>;
    rerenderDetails: () => void;
}

function rowsForSelectedDate(
    state: CalendarDetailsState,
): CalendarDetailsState["dates"][string] {
    const KEY = state.selectedDate;
    if (!(KEY in state.dates)) {
        return [];
    }
    return state.dates[KEY];
}

function titleForSelectedDate(key: string): HTMLHeadingElement {
    const TITLE = document.createElement("h2");
    TITLE.textContent = "Selected Day";
    if (key) {
        TITLE.textContent = dateHeading(key);
    }
    return TITLE;
}

function defaultManualAddValues(rows: CalendarDetailsState["dates"][string]): {
    firstBookId: string;
    firstMinutes: number | null;
} {
    if (rows.length === 0) {
        return { firstBookId: "", firstMinutes: null };
    }
    return {
        firstBookId: rows[0].book_id,
        firstMinutes: rows[0].minutes,
    };
}

function scheduledBookTitles(
    rows: CalendarDetailsState["dates"][string],
): string[] {
    const SEEN_TITLES = new Set<string>();
    const TITLES: string[] = [];
    for (const ROW of rows) {
        if (ROW.finish) {
            continue;
        }
        const TITLE = String(ROW.title || "").trim() || "Untitled";
        if (SEEN_TITLES.has(TITLE)) {
            continue;
        }
        SEEN_TITLES.add(TITLE);
        TITLES.push(TITLE);
    }
    return TITLES;
}

function booksListNode(bookTitles: string[]): HTMLElement {
    const LIST = document.createElement("ul");
    LIST.className = "day-scheduled-books-list";
    for (const TITLE of bookTitles) {
        const ITEM = document.createElement("li");
        ITEM.className = "day-scheduled-book-item";
        ITEM.textContent = TITLE;
        LIST.append(ITEM);
    }
    return LIST;
}

function manualAddPanel(args: ManualAddPanelArgs): HTMLElement {
    let defaultMinutes: number | undefined;
    if (args.defaults.firstMinutes !== null) {
        defaultMinutes = args.defaults.firstMinutes;
    }
    return buildManualSessionAddPanel({
        dateKey: args.key,
        defaultBookId: args.defaults.firstBookId,
        defaultMinutes,
        interactionHandlers: args.interactionHandlers,
        mode: args.mode,
        rerenderDetails: args.rerenderDetails,
    });
}

function renderHintOnly(
    details: HTMLElement,
    title: HTMLElement,
    state: CalendarDetailsState,
): void {
    const HINT = document.createElement("p");
    HINT.className = "hint-text";
    HINT.textContent = "Select a day in the schedule grid to view details.";
    details.replaceChildren(title, HINT);
    state.expectedFinishHighlightDate = "";
}

interface RenderEmptyRowsArgs {
    details: HTMLElement;
    mode: ReturnType<typeof dayMode>;
    panel: HTMLElement;
    state: CalendarDetailsState;
    title: HTMLElement;
}

function renderEmptyRows(args: RenderEmptyRowsArgs): void {
    const EMPTY = document.createElement("p");
    EMPTY.className = "hint-text";
    EMPTY.textContent = emptyMessageForMode(args.mode);
    args.details.replaceChildren(args.title, EMPTY, args.panel);
    args.state.expectedFinishHighlightDate = "";
}

/**
 * Renders selected-day details list and manual-add panel for current mode.
 * @param state Calendar details render state.
 * @param interactionHandlers Detail interaction callbacks.
 * @param onRerenderRequested Optional rerender callback override.
 */
export function renderCalendarDetails(
    state: CalendarDetailsState,
    interactionHandlers: DetailInteractionHandlers,
    onRerenderRequested: (() => void) | null = null,
): void {
    const CALENDAR_STATE = state;
    const DETAILS = el("calendarDayDetails");
    const KEY = CALENDAR_STATE.selectedDate;
    const ROWS = rowsForSelectedDate(CALENDAR_STATE);
    const TITLE = titleForSelectedDate(KEY);

    if (!KEY) {
        renderHintOnly(DETAILS, TITLE, CALENDAR_STATE);
        return;
    }

    const MODE = dayMode(KEY);
    const RERENDER_DETAILS = (): void => {
        if (onRerenderRequested !== null) {
            onRerenderRequested();
            return;
        }
        renderCalendarDetails(
            CALENDAR_STATE,
            interactionHandlers,
            onRerenderRequested,
        );
    };
    const ROWS_TO_RENDER = rowsForMode(ROWS, MODE, interactionHandlers);
    const SCHEDULED_BOOK_TITLES = scheduledBookTitles(ROWS_TO_RENDER);
    const DEFAULTS = defaultManualAddValues(ROWS_TO_RENDER);
    const MANUAL_ADD_PANEL = manualAddPanel({
        defaults: DEFAULTS,
        interactionHandlers,
        key: KEY,
        mode: MODE,
        rerenderDetails: RERENDER_DETAILS,
    });
    if (!SCHEDULED_BOOK_TITLES.length) {
        renderEmptyRows({
            details: DETAILS,
            mode: MODE,
            panel: MANUAL_ADD_PANEL,
            state: CALENDAR_STATE,
            title: TITLE,
        });
        return;
    }

    const LIST = booksListNode(SCHEDULED_BOOK_TITLES);

    DETAILS.replaceChildren(TITLE, LIST, MANUAL_ADD_PANEL);
    CALENDAR_STATE.expectedFinishHighlightDate = "";
}

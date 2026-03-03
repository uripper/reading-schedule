import type {
    CalendarDetailsState,
    DetailInteractionHandlers,
} from "../../types/types.js";
import { el } from "../dom.js";
import { buildManualSessionAddPanel, dayMode } from "./details_helpers.js";
import {
    emptyMessageForMode,
    rowNodeForMode,
    rowsForMode,
} from "./details_render_helpers.js";
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

interface AppendRenderedRowsArgs {
    interactionHandlers: DetailInteractionHandlers;
    list: HTMLElement;
    mode: ReturnType<typeof dayMode>;
    rerenderDetails: () => void;
    rows: CalendarDetailsState["dates"][string];
    state: CalendarDetailsState;
}

function appendRenderedRows(args: AppendRenderedRowsArgs): void {
    const ANIMATE_FINISH_ROWS =
        args.state.expectedFinishHighlightDate === args.state.selectedDate;

    args.rows.forEach((row) => {
        const NODE = rowNodeForMode({
            interactionHandlers: args.interactionHandlers,
            mode: args.mode,
            rerenderDetails: args.rerenderDetails,
            row,
            state: args.state,
        });
        if (ANIMATE_FINISH_ROWS && row.finish) {
            NODE.classList.add("is-finish-pulse");
        }
        args.list.append(NODE);
    });
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
    const DEFAULTS = defaultManualAddValues(ROWS_TO_RENDER);
    const MANUAL_ADD_PANEL = manualAddPanel({
        defaults: DEFAULTS,
        interactionHandlers,
        key: KEY,
        mode: MODE,
        rerenderDetails: RERENDER_DETAILS,
    });
    if (!ROWS_TO_RENDER.length) {
        renderEmptyRows({
            details: DETAILS,
            mode: MODE,
            panel: MANUAL_ADD_PANEL,
            state: CALENDAR_STATE,
            title: TITLE,
        });
        return;
    }

    const LIST = document.createElement("div");
    LIST.className = "day-details-list";
    appendRenderedRows({
        interactionHandlers,
        list: LIST,
        mode: MODE,
        rerenderDetails: RERENDER_DETAILS,
        rows: ROWS_TO_RENDER,
        state: CALENDAR_STATE,
    });

    DETAILS.replaceChildren(TITLE, LIST, MANUAL_ADD_PANEL);
    CALENDAR_STATE.expectedFinishHighlightDate = "";
}

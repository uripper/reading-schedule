import {
    type CalendarDetailsState,
    type DetailInteractionHandlers,
} from "../../types/types.js";
import { el } from "../dom.js";
import { buildManualSessionAddPanel, dayMode } from "./details_helpers.js";
import {
    emptyMessageForMode,
    rowNodeForMode,
    rowsForMode,
} from "./details_render_helpers.js";
import { dateHeading } from "./utils.js";

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
    let rows: CalendarDetailsState["dates"][string] = [];
    if (KEY in CALENDAR_STATE.dates) {
        rows = CALENDAR_STATE.dates[KEY];
    }

    const TITLE = document.createElement("h2");
    TITLE.textContent = "Selected Day";
    if (KEY) {
        TITLE.textContent = dateHeading(KEY);
    }

    if (!KEY) {
        const HINT = document.createElement("p");
        HINT.className = "hint-text";
        HINT.textContent = "Select a day in the schedule grid to view details.";
        DETAILS.replaceChildren(TITLE, HINT);
        CALENDAR_STATE.expectedFinishHighlightDate = "";
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
    const ROWS_TO_RENDER = rowsForMode(rows, MODE, interactionHandlers);
    let firstBookId = "";
    let firstMinutes: number | null = null;
    if (ROWS_TO_RENDER.length > 0) {
        const FIRST_ROW = ROWS_TO_RENDER[0];
        firstBookId = FIRST_ROW.book_id;
        firstMinutes = FIRST_ROW.minutes;
    }
    const MANUAL_ADD_PANEL = buildManualSessionAddPanel({
        dateKey: KEY,
        defaultBookId: firstBookId,
        defaultMinutes: firstMinutes ?? undefined,
        interactionHandlers,
        mode: MODE,
        rerenderDetails: RERENDER_DETAILS,
    });
    if (!ROWS_TO_RENDER.length) {
        const EMPTY = document.createElement("p");
        EMPTY.className = "hint-text";
        EMPTY.textContent = emptyMessageForMode(MODE);
        DETAILS.replaceChildren(TITLE, EMPTY, MANUAL_ADD_PANEL);
        CALENDAR_STATE.expectedFinishHighlightDate = "";
        return;
    }

    const LIST = document.createElement("div");
    LIST.className = "day-details-list";
    const ANIMATE_FINISH_ROWS =
        CALENDAR_STATE.expectedFinishHighlightDate === KEY;

    ROWS_TO_RENDER.forEach((row) => {
        const NODE = rowNodeForMode({
            interactionHandlers,
            mode: MODE,
            rerenderDetails: RERENDER_DETAILS,
            row,
            state: CALENDAR_STATE,
        });
        if (ANIMATE_FINISH_ROWS && row.finish) {
            NODE.classList.add("is-finish-pulse");
        }
        LIST.append(NODE);
    });

    DETAILS.replaceChildren(TITLE, LIST, MANUAL_ADD_PANEL);
    CALENDAR_STATE.expectedFinishHighlightDate = "";
}

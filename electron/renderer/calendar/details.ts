/**
 * Renders selected-day schedule details and manual-add controls for the
 * calendar side panel.
 */
import type {
    CalendarDetailsState,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import { el } from "../dom.ts";
import {
    buildManualSessionAddPanel,
    buildSessionItemsForMode,
    DEFAULT_DETAILS_ITEM_BUILDERS,
    dayMode,
} from "./details_helpers.ts";
import { emptyMessageForMode, rowsForMode } from "./details_render_helpers.ts";
import { dateHeading } from "./utils.ts";

// TODO: Move these calendar detail view-only interfaces into `electron/types`
// when the renderer detail contracts are consolidated.
interface ManualAddPanelArgs {
    defaults: ReturnType<typeof defaultManualAddValues>;
    interactionHandlers: DetailInteractionHandlers;
    key: string;
    mode: ReturnType<typeof dayMode>;
    rerenderDetails: () => void;
}

/**
 * Resolves schedule rows for the currently selected calendar day.
 * @param state - Calendar details state snapshot.
 * @returns Rows for the selected day or an empty list.
 */
function rowsForSelectedDate(
    state: CalendarDetailsState,
): CalendarDetailsState["dates"][string] {
    const KEY = state.selectedDate;
    if (!(KEY in state.dates)) {
        return [];
    }
    return state.dates[KEY];
}

/**
 * Builds the heading element for the selected calendar day.
 * @param key - Selected day key.
 * @returns Heading element for the details panel.
 */
function titleForSelectedDate(key: string): HTMLHeadingElement {
    const TITLE = document.createElement("h2");
    TITLE.textContent = "Selected Day";
    if (key) {
        TITLE.textContent = dateHeading(key);
    }
    return TITLE;
}

/**
 * Computes initial values for the manual-session add form.
 * @param rows - Rows currently rendered for the selected day.
 * @returns Default book id and minutes for the add panel.
 */
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

/**
 * Builds the manual-session add panel for the selected day.
 * @param args - Default values, handlers, and rerender wiring.
 * @returns Manual add panel element.
 */
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

function clearExpectedFinishHighlight(state: CalendarDetailsState): void {
    const CALENDAR_STATE = state;
    CALENDAR_STATE.expectedFinishHighlightDate = "";
}

/**
 * Renders the empty hint state when no day is selected.
 * @param details - Calendar detail container.
 * @param title - Heading element for the panel.
 * @param state - Calendar details state snapshot.
 */
function renderHintOnly(
    details: HTMLElement,
    title: HTMLElement,
    state: CalendarDetailsState,
): void {
    const HINT = document.createElement("p");
    HINT.className = "hint-text";
    HINT.textContent = "Select a day in the schedule grid to view details.";
    details.replaceChildren(title, HINT);
    clearExpectedFinishHighlight(state);
}

// TODO: Move these calendar detail view-only interfaces into `electron/types`
// when the renderer detail contracts are consolidated.
interface DetailsListArgs {
    interactionHandlers: DetailInteractionHandlers;
    mode: ReturnType<typeof dayMode>;
    rerenderDetails: () => void;
    rows: CalendarDetailsState["dates"][string];
    state: CalendarDetailsState;
}

/**
 * Builds the selected-day session list for the current calendar mode.
 * @param args - Rows, handlers, and rerender callback.
 * @returns Detail list wrapper with rendered session items.
 */
function detailsListNode(args: DetailsListArgs): HTMLElement {
    const LIST = document.createElement("div");
    LIST.className = "day-details-list";
    const ITEM_NODES = buildSessionItemsForMode({
        builders: DEFAULT_DETAILS_ITEM_BUILDERS,
        interactionHandlers: args.interactionHandlers,
        mode: args.mode,
        rerenderDetails: args.rerenderDetails,
        rows: args.rows,
        state: args.state,
    });
    LIST.append(...ITEM_NODES);
    return LIST;
}

// TODO: Move these calendar detail view-only interfaces into `electron/types`
// when the renderer detail contracts are consolidated.
interface RenderEmptyRowsArgs {
    details: HTMLElement;
    mode: ReturnType<typeof dayMode>;
    panel: HTMLElement;
    state: CalendarDetailsState;
    title: HTMLElement;
}

/**
 * Renders the empty-row state while keeping manual add available.
 * @param args - Empty-state render inputs.
 */
function renderEmptyRows(args: RenderEmptyRowsArgs): void {
    const EMPTY = document.createElement("p");
    EMPTY.className = "hint-text";
    EMPTY.textContent = emptyMessageForMode(args.mode);
    args.details.replaceChildren(args.title, EMPTY, args.panel);
    clearExpectedFinishHighlight(args.state);
}

function rerenderDetailsCallback(args: {
    state: CalendarDetailsState;
    interactionHandlers: DetailInteractionHandlers;
    onRerenderRequested: (() => void) | null;
}): () => void {
    return () => {
        if (args.onRerenderRequested !== null) {
            args.onRerenderRequested();
            return;
        }
        renderCalendarDetails(
            args.state,
            args.interactionHandlers,
            args.onRerenderRequested,
        );
    };
}

function manualAddPanelForSelection(args: {
    key: string;
    mode: ReturnType<typeof dayMode>;
    rowsToRender: CalendarDetailsState["dates"][string];
    interactionHandlers: DetailInteractionHandlers;
    rerenderDetails: () => void;
}): HTMLElement {
    return manualAddPanel({
        defaults: defaultManualAddValues(args.rowsToRender),
        interactionHandlers: args.interactionHandlers,
        key: args.key,
        mode: args.mode,
        rerenderDetails: args.rerenderDetails,
    });
}

function renderPopulatedDetails(args: {
    details: HTMLElement;
    title: HTMLElement;
    panel: HTMLElement;
    mode: ReturnType<typeof dayMode>;
    rows: CalendarDetailsState["dates"][string];
    state: CalendarDetailsState;
    interactionHandlers: DetailInteractionHandlers;
    rerenderDetails: () => void;
}): void {
    const DETAILS_LIST = detailsListNode({
        interactionHandlers: args.interactionHandlers,
        mode: args.mode,
        rerenderDetails: args.rerenderDetails,
        rows: args.rows,
        state: args.state,
    });
    args.details.replaceChildren(args.title, DETAILS_LIST, args.panel);
    clearExpectedFinishHighlight(args.state);
}

type RenderSelectedDayDetailsArgs = {
    details: HTMLElement;
    title: HTMLElement;
    key: string;
    state: CalendarDetailsState;
    interactionHandlers: DetailInteractionHandlers;
    onRerenderRequested: (() => void) | null;
};

function selectedDayRows(args: RenderSelectedDayDetailsArgs): {
    mode: ReturnType<typeof dayMode>;
    rerenderDetails: () => void;
    rowsToRender: CalendarDetailsState["dates"][string];
} {
    const MODE = dayMode(args.key);
    const RERENDER_DETAILS = rerenderDetailsCallback({
        interactionHandlers: args.interactionHandlers,
        onRerenderRequested: args.onRerenderRequested,
        state: args.state,
    });
    return {
        mode: MODE,
        rerenderDetails: RERENDER_DETAILS,
        rowsToRender: rowsForMode(
            rowsForSelectedDate(args.state),
            MODE,
            args.interactionHandlers,
        ),
    };
}

function selectedDayPanel(
    args: RenderSelectedDayDetailsArgs,
    selectedRows: ReturnType<typeof selectedDayRows>,
): HTMLElement {
    return manualAddPanelForSelection({
        interactionHandlers: args.interactionHandlers,
        key: args.key,
        mode: selectedRows.mode,
        rerenderDetails: selectedRows.rerenderDetails,
        rowsToRender: selectedRows.rowsToRender,
    });
}

function renderSelectedDayContent(args: {
    detailsArgs: RenderSelectedDayDetailsArgs;
    selectedRows: ReturnType<typeof selectedDayRows>;
    panel: HTMLElement;
}): void {
    renderPopulatedDetails({
        details: args.detailsArgs.details,
        interactionHandlers: args.detailsArgs.interactionHandlers,
        mode: args.selectedRows.mode,
        panel: args.panel,
        rerenderDetails: args.selectedRows.rerenderDetails,
        rows: args.selectedRows.rowsToRender,
        state: args.detailsArgs.state,
        title: args.detailsArgs.title,
    });
}

function renderSelectedDayRows(
    args: RenderSelectedDayDetailsArgs,
    selectedRows: ReturnType<typeof selectedDayRows>,
): void {
    const MANUAL_ADD_PANEL = selectedDayPanel(args, selectedRows);
    if (!selectedRows.rowsToRender.length) {
        renderEmptyRows({
            details: args.details,
            mode: selectedRows.mode,
            panel: MANUAL_ADD_PANEL,
            state: args.state,
            title: args.title,
        });
        return;
    }
    renderSelectedDayContent({
        detailsArgs: args,
        panel: MANUAL_ADD_PANEL,
        selectedRows,
    });
}

function renderSelectedDayDetails(args: RenderSelectedDayDetailsArgs): void {
    renderSelectedDayRows(args, selectedDayRows(args));
}

/**
 * Renders selected-day details list and manual-add panel for current mode.
 * @param state - Calendar details render state.
 * @param interactionHandlers - Detail interaction callbacks.
 * @param onRerenderRequested - Optional rerender callback override.
 */
export function renderCalendarDetails(
    state: CalendarDetailsState,
    interactionHandlers: DetailInteractionHandlers,
    onRerenderRequested: (() => void) | null = null,
): void {
    const DETAILS = el("calendarDayDetails");
    const KEY = state.selectedDate;
    const TITLE = titleForSelectedDate(KEY);
    if (!KEY) {
        renderHintOnly(DETAILS, TITLE, state);
        return;
    }
    renderSelectedDayDetails({
        details: DETAILS,
        interactionHandlers,
        key: KEY,
        onRerenderRequested,
        state,
        title: TITLE,
    });
}

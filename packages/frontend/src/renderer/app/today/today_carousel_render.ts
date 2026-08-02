/**
 * Renders the Today carousel shell and active-session control panel.
 */
import type { Book, PlannerResult } from "../../../types/types.ts";
import { el } from "../../dom.ts";
import type { TodayCarouselActionBindings } from "./today_carousel_action_bindings.ts";
import {
    bindMinutesEditor,
    bindRemoveButton,
    bindToggleButton,
} from "./today_carousel_action_bindings.ts";
import { addBookHandler } from "./today_carousel_add_book.ts";
import type { TodayCarouselActiveItem } from "./today_carousel_model.ts";
import { buildTodayCarouselModel } from "./today_carousel_model.ts";
import {
    afterSessionText,
    clearNoDataHandlers,
    renderAfterSessionText,
    renderProgressSummary,
    resetProgressIndicator,
    setActionButtonsDisabled,
    setLogButtonState,
    setMinutesEditDisabled,
    setProgressInputsDisabled,
} from "./today_carousel_panel.ts";
import {
    bindTodayProgressInputs,
    resetTodayProgressInputs,
} from "./today_carousel_progress_bindings.ts";
import {
    closeMinutesEditor,
    minutesEditor,
    pinnedRowKeySnapshot,
    resetTodayCarouselUiState,
    selectedBookId,
    setSelectedBookId,
} from "./today_carousel_state.ts";
import {
    bindCarouselNavigation,
    renderCarouselTrack,
} from "./today_carousel_track.ts";

const EMPTY_TEXT = "";
const EMPTY_BOOK_LABEL = "No book selected";
const EMPTY_MINUTES_TEXT = "0";
const EMPTY_PROGRESS_TOTAL_TEXT = "--";
const EMPTY_SESSION_SUMMARY_TEXT = "-- pages • --%";

interface TodayCarouselRenderArgs {
    books: Book[];
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
}

interface TodayInteractionBindings {
    listSessionBooks: TodayCarouselActionBindings["listSessionBooks"];
    onManualSessionAdded: TodayCarouselActionBindings["onManualSessionAdded"];
    onSessionCompletionChanged: TodayCarouselActionBindings["onSessionCompletionChanged"];
    onSessionMinutesUpdated: TodayCarouselActionBindings["onSessionMinutesUpdated"];
    onSessionProgressUpdated: TodayCarouselActionBindings["onSessionProgressUpdated"];
    onSessionRemoved: TodayCarouselActionBindings["onSessionRemoved"];
    rerender(): void;
    setStatus(message: string, isError?: boolean): void;
}
let interactions: TodayInteractionBindings | null = null;

/**
 * Returns the currently configured Today interaction bindings.
 * @returns Interaction callbacks or `null` when unconfigured.
 */
function interactionBindings(): TodayInteractionBindings | null {
    return interactions;
}

/**
 * Requests a full Today rerender through the configured interaction bindings.
 */
function requestRerender(): void {
    interactionBindings()?.rerender();
}

/**
 * Selects a book in the Today carousel and closes row-local edit state.
 * @param bookId - Book id to focus in the carousel.
 */
function selectBook(bookId: string): void {
    closeMinutesEditor();
    setSelectedBookId(bookId);
    requestRerender();
}

function resetNoDataMinutesUi(): void {
    el<HTMLElement>("todayMinutesValue").textContent = EMPTY_MINUTES_TEXT;
    el<HTMLElement>("todayMinutesValue").hidden = false;
    el<HTMLInputElement>("todayMinutesInput").hidden = true;
    el<HTMLInputElement>("todayMinutesInput").value = EMPTY_TEXT;
}

function resetNoDataProgressUi(): void {
    renderAfterSessionText(EMPTY_SESSION_SUMMARY_TEXT);
    el<HTMLElement>("todayProgressPagesTotalText").textContent =
        EMPTY_PROGRESS_TOTAL_TEXT;
    resetProgressIndicator();
    resetTodayProgressInputs();
    setMinutesEditDisabled(true);
    setActionButtonsDisabled(true);
    setLogButtonState(false);
    setProgressInputsDisabled(true);
}

function renderNoData(options: { showAddBookAction: boolean }): void {
    resetTodayCarouselUiState();
    clearNoDataHandlers();
    el<HTMLElement>("todayCarouselEmpty").hidden = options.showAddBookAction;
    el<HTMLElement>("todayActiveBookBar").textContent = noDataBookBarText(
        options.showAddBookAction,
    );
    if (!options.showAddBookAction) {
        el<HTMLElement>("todayCarouselTrack").replaceChildren();
    }
    resetNoDataMinutesUi();
    resetNoDataProgressUi();
}

function noDataBookBarText(showAddBookAction: boolean): string {
    if (showAddBookAction) {
        return "Add a book to Today";
    }
    return EMPTY_BOOK_LABEL;
}

function applyOpenMinutesEditor(
    input: HTMLInputElement,
    editButton: HTMLButtonElement,
    valueText: string,
): void {
    const INPUT = input;
    const EDIT_BUTTON = editButton;
    INPUT.value = valueText;
    EDIT_BUTTON.textContent = "✓";
    EDIT_BUTTON.setAttribute("aria-label", "Save planned minutes");
    if (globalThis.document.activeElement !== INPUT) {
        INPUT.focus();
        INPUT.select();
    }
}

function applyClosedMinutesEditor(editButton: HTMLButtonElement): void {
    const EDIT_BUTTON = editButton;
    EDIT_BUTTON.textContent = "✎";
    EDIT_BUTTON.setAttribute("aria-label", "Edit planned minutes");
}

/**
 * Toggles the minutes label/input pair for the active row edit state.
 * @param active - Active Today carousel row.
 */
function applyMinutesEditorVisibility(active: TodayCarouselActiveItem): void {
    const EDIT_STATE = minutesEditor();
    const IS_EDIT_OPEN = EDIT_STATE?.rowKey === active.row.rowKey;
    const VALUE = el<HTMLElement>("todayMinutesValue");
    const INPUT = el<HTMLInputElement>("todayMinutesInput");
    const EDIT_BUTTON = el<HTMLButtonElement>("todayMinutesEditBtn");
    VALUE.hidden = IS_EDIT_OPEN;
    INPUT.hidden = !IS_EDIT_OPEN;
    if (IS_EDIT_OPEN) {
        applyOpenMinutesEditor(
            INPUT,
            EDIT_BUTTON,
            EDIT_STATE?.valueText ?? EMPTY_TEXT,
        );
        return;
    }
    applyClosedMinutesEditor(EDIT_BUTTON);
}

/**
 * Renders the active Today row and binds its action handlers.
 * @param active - Active Today carousel row.
 */
function renderActive(active: TodayCarouselActiveItem): void {
    renderActiveSummary(active);
    bindActiveActions(active);
}

function renderActiveSummary(active: TodayCarouselActiveItem): void {
    el<HTMLElement>("todayCarouselEmpty").hidden = true;
    el<HTMLElement>("todayActiveBookBar").textContent =
        `${active.book.title} | ${active.book.author}`;
    el<HTMLElement>("todayMinutesValue").textContent = String(
        active.row.minutes,
    );
    renderAfterSessionText(afterSessionText(active));
    renderProgressSummary(active);
    bindTodayProgressInputs(active);
    applyMinutesEditorVisibility(active);
    setMinutesEditDisabled(false);
    setActionButtonsDisabled(false);
    setLogButtonState(active.row.completed);
    setProgressInputsDisabled(active.row.completed);
}

function bindActiveActions(active: TodayCarouselActiveItem): void {
    bindMinutesEditor({
        active,
        bindings: interactionBindings(),
        onUiRerender: requestRerender,
    });
    bindRemoveButton({
        active,
        bindings: interactionBindings(),
    });
    bindToggleButton({
        active,
        bindings: interactionBindings(),
    });
}

/**
 * Configures the shared Today callbacks used by the carousel renderer.
 * @param bindings - Mutation and status callbacks for Today actions.
 */
export function configureTodayInteractions(
    bindings: TodayInteractionBindings,
): void {
    interactions = bindings;
}

/**
 * Renders the Today carousel track and active-session panel.
 * @param args - Books, schedule result, and completion state.
 */
export function renderTodayCarousel(args: TodayCarouselRenderArgs): void {
    const MODEL = buildTodayCarouselModel({
        books: args.books,
        lastResult: args.lastResult,
        pinnedRowKeyByBookId: pinnedRowKeySnapshot(),
        scheduleCompletions: args.scheduleCompletions,
        selectedBookId: selectedBookId(),
    });
    setSelectedBookId(MODEL.selectedBookId);
    const ADD_BOOK_HANDLER = addBookHandler({
        bindings: interactionBindings(),
        books: args.books,
        modelBooks: MODEL.books,
    });
    renderCarouselTrack(MODEL, selectBook, ADD_BOOK_HANDLER);
    bindCarouselNavigation(MODEL, selectBook);
    if (MODEL.active === null) {
        renderNoData({
            showAddBookAction: ADD_BOOK_HANDLER !== undefined,
        });
        return;
    }
    renderActive(MODEL.active);
}

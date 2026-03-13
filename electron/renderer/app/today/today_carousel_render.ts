/**
 * Renders the Today carousel shell and active-session control panel.
 */
import type { Book, PlannerResult } from "../../../types/types.js";
import { el } from "../../dom.js";
import {
    bindMinutesEditor,
    bindRemoveButton,
    bindToggleButton,
    type TodayCarouselActionBindings,
} from "./today_carousel_action_bindings.js";
import {
    buildTodayCarouselModel,
    type TodayCarouselActiveItem,
} from "./today_carousel_model.js";
import {
    afterSessionText,
    clearNoDataHandlers,
    renderAfterSessionText,
    renderProgressSummary,
    setActionButtonsDisabled,
    setLogButtonState,
    setMinutesEditDisabled,
    setProgressInputsDisabled,
} from "./today_carousel_panel.js";
import {
    bindTodayProgressInputs,
    resetTodayProgressInputs,
} from "./today_carousel_progress_bindings.js";
import {
    closeMinutesEditor,
    minutesEditor,
    pinnedRowKeySnapshot,
    resetTodayCarouselUiState,
    selectedBookId,
    setSelectedBookId,
} from "./today_carousel_state.js";
import {
    bindCarouselNavigation,
    renderCarouselTrack,
} from "./today_carousel_track.js";

const EMPTY_TEXT = "";

// TODO: Move Today carousel render contracts into `electron/types` when the
// renderer Today surface is stabilized.
interface TodayCarouselRenderArgs {
    books: Book[];
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
}

// TODO: Move Today carousel render contracts into `electron/types` when the
// renderer Today surface is stabilized.
interface TodayInteractionBindings {
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

/**
 * Renders the empty Today state when there is no active session.
 */
function renderNoData(): void {
    resetTodayCarouselUiState();
    clearNoDataHandlers();
    el<HTMLElement>("todayCarouselEmpty").hidden = false;
    el<HTMLElement>("todayActiveBookBar").textContent = "No book selected";
    el<HTMLElement>("todayCarouselTrack").replaceChildren();
    el<HTMLElement>("todayMinutesValue").textContent = "0";
    el<HTMLElement>("todayMinutesValue").hidden = false;
    el<HTMLInputElement>("todayMinutesInput").hidden = true;
    el<HTMLInputElement>("todayMinutesInput").value = EMPTY_TEXT;
    renderAfterSessionText("-- pages\n--%");
    el<HTMLElement>("todayProgressPagesTotalText").textContent = "--";
    resetTodayProgressInputs();
    setMinutesEditDisabled(true);
    setActionButtonsDisabled(true);
    setLogButtonState(false);
    setProgressInputsDisabled(true);
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
        INPUT.value = EDIT_STATE?.valueText ?? EMPTY_TEXT;
        EDIT_BUTTON.textContent = "✓";
        EDIT_BUTTON.setAttribute("aria-label", "Save planned minutes");
        if (globalThis.document.activeElement !== INPUT) {
            INPUT.focus();
            INPUT.select();
        }
        return;
    }
    EDIT_BUTTON.textContent = "✎";
    EDIT_BUTTON.setAttribute("aria-label", "Edit planned minutes");
}

/**
 * Renders the active Today row and binds its action handlers.
 * @param active - Active Today carousel row.
 */
function renderActive(active: TodayCarouselActiveItem): void {
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
    renderCarouselTrack(MODEL, selectBook);
    bindCarouselNavigation(MODEL, selectBook);
    if (MODEL.active === null) {
        renderNoData();
        return;
    }
    renderActive(MODEL.active);
}

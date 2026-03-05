import type { Book, PlannerResult } from "../../../types/types.js";
import { el } from "../../dom.js";
import {
    bindMinutesEditor,
    bindToggleButton,
    type TodayCarouselActionBindings,
} from "./today_carousel_action_bindings.js";
import {
    logSessionButtonText,
    shouldDisableProgressInputs,
} from "./today_carousel_actions.js";
import {
    buildTodayCarouselModel,
    type TodayCarouselActiveItem,
    type TodayCarouselModel,
} from "./today_carousel_model.js";
import { formatPagesTotalText } from "./today_carousel_progress.js";
import {
    closeMinutesEditor,
    minutesEditor,
    pinnedRowKeySnapshot,
    progressDraft,
    selectedBookId,
    setProgressDraft,
    setSelectedBookId,
} from "./today_carousel_state.js";

const EMPTY_TEXT = "";
interface TodayCarouselRenderArgs {
    books: Book[];
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
}

interface TodayInteractionBindings {
    onSessionCompletionChanged: TodayCarouselActionBindings["onSessionCompletionChanged"];
    onSessionMinutesUpdated: TodayCarouselActionBindings["onSessionMinutesUpdated"];
    onSessionProgressUpdated: TodayCarouselActionBindings["onSessionProgressUpdated"];
    rerender(): void;
    setStatus(message: string, isError?: boolean): void;
}
let interactions: TodayInteractionBindings | null = null;
const EMPTY_INDEX = -1;
const HOME_INDEX = 0;
const STEP_PREVIOUS = -1;
const STEP_NEXT = 1;
const MIN_VISIBLE_OFFSET = -2;
const MAX_VISIBLE_OFFSET = 2;
type TodayCarouselTrackBook = TodayCarouselModel["books"][number];

function interactionBindings(): TodayInteractionBindings | null {
    return interactions;
}
function requestRerender(): void {
    interactionBindings()?.rerender();
}
function selectBook(bookId: string): void {
    closeMinutesEditor();
    setSelectedBookId(bookId);
    requestRerender();
}
function fallbackText(title: string): string {
    const TITLE = String(title || "").trim();
    if (!TITLE) {
        return "?";
    }
    return TITLE.slice(0, 1).toUpperCase();
}
function setLogButtonState(completed: boolean): void {
    const BUTTON = el<HTMLButtonElement>("todayLogSessionBtn");
    const PANEL = el<HTMLElement>("todayFocusPanel");
    BUTTON.textContent = logSessionButtonText(completed);
    BUTTON.classList.toggle("is-complete", completed);
    PANEL.classList.toggle("is-complete", completed);
}
function setProgressInputsDisabled(completed: boolean): void {
    const DISABLED = shouldDisableProgressInputs(completed);
    el<HTMLInputElement>("todayPagesInput").disabled = DISABLED;
    el<HTMLInputElement>("todayPercentInput").disabled = DISABLED;
}
function afterSessionText(active: TodayCarouselActiveItem): string {
    let pages = "--";
    if (active.afterPagesRead !== null) {
        pages = String(active.afterPagesRead);
    }
    const PERCENT = `${Math.round(active.afterPercent * 10) / 10}%`;
    return `${pages} pages\n${PERCENT}`;
}

function renderAfterSessionText(text: string): void {
    const AFTER_SESSION = el<HTMLElement>("todayAfterSessionText");
    const LABEL = document.createElement("span");
    LABEL.className = "today-after-session-label";
    LABEL.textContent = "After Session:";
    const VALUES = document.createElement("span");
    VALUES.className = "today-after-session-values";
    VALUES.textContent = text;
    AFTER_SESSION.replaceChildren(LABEL, VALUES);
}
function inputDraft(active: TodayCarouselActiveItem): {
    pagesText: string;
    percentText: string;
} {
    const DRAFT = progressDraft(active.row.rowKey);
    if (DRAFT !== null) {
        return DRAFT;
    }
    let pagesText = EMPTY_TEXT;
    if (active.pagesRead !== null) {
        pagesText = String(active.pagesRead);
    }
    return {
        pagesText,
        percentText: String(active.progressPercent),
    };
}
function wrappedIndex(index: number, delta: number, total: number): number {
    if (total <= 0) {
        return HOME_INDEX;
    }
    const NEXT_INDEX = index + delta;
    let wrapped = NEXT_INDEX % total;
    if (wrapped < 0) {
        wrapped += total;
    }
    return wrapped;
}

function selectedIndex(model: TodayCarouselModel): number {
    const CURRENT_SELECTED = selectedBookId();
    const INDEX = model.books.findIndex(
        (book) => book.bookId === CURRENT_SELECTED,
    );
    if (INDEX === EMPTY_INDEX) {
        return HOME_INDEX;
    }
    return INDEX;
}

function bindCarouselNavigation(model: TodayCarouselModel): void {
    const PREV = el<HTMLButtonElement>("todayCarouselPrev");
    const NEXT = el<HTMLButtonElement>("todayCarouselNext");
    const TRACK = el<HTMLElement>("todayCarouselTrack");
    const MOVE_SELECTION = (delta: number): void => {
        if (!model.books.length) {
            return;
        }
        const CURRENT_INDEX = selectedIndex(model);
        const NEXT_INDEX = wrappedIndex(
            CURRENT_INDEX,
            delta,
            model.books.length,
        );
        selectBook(model.books[NEXT_INDEX].bookId);
    };
    PREV.onclick = () => MOVE_SELECTION(STEP_PREVIOUS);
    NEXT.onclick = () => MOVE_SELECTION(STEP_NEXT);
    TRACK.onkeydown = (event) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            MOVE_SELECTION(STEP_PREVIOUS);
            return;
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            MOVE_SELECTION(STEP_NEXT);
            return;
        }
        if (event.key === "Home" && model.books.length) {
            event.preventDefault();
            selectBook(model.books[HOME_INDEX].bookId);
            return;
        }
        if (event.key === "End" && model.books.length) {
            event.preventDefault();
            selectBook(model.books[model.books.length - 1].bookId);
        }
    };
}

function centerBookInTrack(track: HTMLElement, bookId: string): void {
    if (!bookId) {
        return;
    }
    const NODE = track.querySelector<HTMLElement>(`[data-book-id="${bookId}"]`);
    if (!(NODE instanceof HTMLElement)) {
        return;
    }
    const TRACK_RECT = track.getBoundingClientRect();
    const NODE_RECT = NODE.getBoundingClientRect();
    const NODE_CENTER =
        NODE_RECT.left -
        TRACK_RECT.left +
        track.scrollLeft +
        NODE_RECT.width / 2;
    const TARGET_LEFT = Math.max(0, NODE_CENTER - TRACK_RECT.width / 2);
    track.scrollLeft = Math.round(TARGET_LEFT);
}

function carouselItems(track: HTMLElement): HTMLButtonElement[] {
    return Array.from(track.children).filter(
        (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
    );
}

function hasSameTrackOrder(
    items: HTMLButtonElement[],
    books: TodayCarouselTrackBook[],
): boolean {
    if (items.length !== books.length) {
        return false;
    }
    return books.every((book, index) => {
        return items[index]?.dataset.bookId === book.bookId;
    });
}

function buildCarouselItem(book: TodayCarouselTrackBook): HTMLButtonElement {
    const ITEM = document.createElement("button");
    ITEM.type = "button";
    ITEM.className = "today-carousel-item";
    ITEM.dataset.bookId = book.bookId;
    ITEM.setAttribute("role", "option");
    ITEM.setAttribute("aria-label", `${book.title} by ${book.author}`);
    ITEM.onclick = () => selectBook(book.bookId);

    if (book.coverSrc) {
        const IMG = document.createElement("img");
        IMG.src = book.coverSrc;
        IMG.alt = `Cover of ${book.title}`;
        IMG.loading = "lazy";
        ITEM.append(IMG);
        return ITEM;
    }
    const FALLBACK = document.createElement("span");
    FALLBACK.className = "today-carousel-fallback";
    FALLBACK.textContent = fallbackText(book.title);
    ITEM.append(FALLBACK);
    return ITEM;
}

function renderTrackItems(
    track: HTMLElement,
    books: TodayCarouselTrackBook[],
): void {
    const ITEMS = carouselItems(track);
    if (hasSameTrackOrder(ITEMS, books)) {
        return;
    }
    const NODES = books.map((book) => buildCarouselItem(book));
    track.replaceChildren(...NODES);
}

function applySelectedItemState(
    track: HTMLElement,
    selectedBookId: string,
    selectedIndex: number,
): void {
    for (const [INDEX, ITEM] of Array.from(track.children).entries()) {
        if (!(ITEM instanceof HTMLButtonElement)) {
            continue;
        }

        const IS_SELECTED = ITEM.dataset.bookId === selectedBookId;
        const OFFSET = INDEX - selectedIndex;
        const CLAMPED_OFFSET = Math.max(
            MIN_VISIBLE_OFFSET,
            Math.min(MAX_VISIBLE_OFFSET, OFFSET),
        );

        ITEM.classList.toggle("is-selected", IS_SELECTED);
        ITEM.setAttribute("aria-selected", String(IS_SELECTED));
        ITEM.dataset.offset = String(CLAMPED_OFFSET);
    }
}

function renderCarouselTrack(model: TodayCarouselModel): void {
    const TRACK = el<HTMLElement>("todayCarouselTrack");
    renderTrackItems(TRACK, model.books);

    const SELECTED_INDEX = model.books.findIndex((book) => {
        return book.bookId === model.selectedBookId;
    });
    applySelectedItemState(TRACK, model.selectedBookId, SELECTED_INDEX);

    requestAnimationFrame(() => {
        centerBookInTrack(TRACK, model.selectedBookId);
    });
}
function renderNoData(): void {
    closeMinutesEditor();
    el<HTMLElement>("todayCarouselEmpty").hidden = false;
    el<HTMLElement>("todayActiveBookBar").textContent = "No book selected";
    el<HTMLElement>("todayCarouselTrack").replaceChildren();
    el<HTMLElement>("todayMinutesValue").textContent = "0";
    el<HTMLElement>("todayMinutesValue").hidden = false;
    el<HTMLInputElement>("todayMinutesInput").hidden = true;
    el<HTMLInputElement>("todayMinutesInput").value = EMPTY_TEXT;
    renderAfterSessionText("-- pages\n--%");
    el<HTMLElement>("todayProgressPagesTotalText").textContent =
        formatPagesTotalText(null);
    el<HTMLInputElement>("todayPagesInput").value = EMPTY_TEXT;
    el<HTMLInputElement>("todayPercentInput").value = EMPTY_TEXT;
    setLogButtonState(false);
    setProgressInputsDisabled(true);
}

function renderProgressSummary(active: TodayCarouselActiveItem): void {
    el<HTMLElement>("todayProgressPagesTotalText").textContent =
        formatPagesTotalText(active.pagesTotal);
}

function bindProgressInputs(active: TodayCarouselActiveItem): void {
    const DRAFT = inputDraft(active);
    const PAGES_INPUT = el<HTMLInputElement>("todayPagesInput");
    const PERCENT_INPUT = el<HTMLInputElement>("todayPercentInput");
    PAGES_INPUT.value = DRAFT.pagesText;
    PERCENT_INPUT.value = DRAFT.percentText;
    PAGES_INPUT.oninput = () => {
        setProgressDraft({
            pagesText: PAGES_INPUT.value,
            percentText: PERCENT_INPUT.value,
            rowKey: active.row.rowKey,
        });
    };
    PERCENT_INPUT.oninput = () => {
        setProgressDraft({
            pagesText: PAGES_INPUT.value,
            percentText: PERCENT_INPUT.value,
            rowKey: active.row.rowKey,
        });
    };
}

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

function renderActive(active: TodayCarouselActiveItem): void {
    el<HTMLElement>("todayCarouselEmpty").hidden = true;
    el<HTMLElement>("todayActiveBookBar").textContent =
        `${active.book.title} | ${active.book.author}`;
    el<HTMLElement>("todayMinutesValue").textContent = String(
        active.row.minutes,
    );
    renderAfterSessionText(afterSessionText(active));
    renderProgressSummary(active);
    bindProgressInputs(active);
    applyMinutesEditorVisibility(active);
    setLogButtonState(active.row.completed);
    setProgressInputsDisabled(active.row.completed);
    bindMinutesEditor({
        active,
        bindings: interactionBindings(),
        onUiRerender: requestRerender,
    });
    bindToggleButton({
        active,
        bindings: interactionBindings(),
    });
}
export function configureTodayInteractions(
    bindings: TodayInteractionBindings,
): void {
    interactions = bindings;
}
export function renderTodayCarousel(args: TodayCarouselRenderArgs): void {
    const MODEL = buildTodayCarouselModel({
        books: args.books,
        lastResult: args.lastResult,
        pinnedRowKeyByBookId: pinnedRowKeySnapshot(),
        scheduleCompletions: args.scheduleCompletions,
        selectedBookId: selectedBookId(),
    });
    setSelectedBookId(MODEL.selectedBookId);
    renderCarouselTrack(MODEL);
    bindCarouselNavigation(MODEL);
    if (MODEL.active === null) {
        renderNoData();
        return;
    }
    renderActive(MODEL.active);
}

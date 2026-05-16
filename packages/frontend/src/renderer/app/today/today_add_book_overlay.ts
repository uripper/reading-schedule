import { el } from "../../dom.ts";

const EMPTY_TEXT = "";
const NO_RESULTS_TEXT = "No matching books.";
const DIALOG_ID = "todayAddBookDialog";
const QUERY_INPUT_ID = "todayAddBookQuery";
const RESULTS_ID = "todayAddBookResults";
const CLOSE_BUTTON_ID = "todayAddBookClose";

export interface TodayAddBookOption {
    bookId: string;
    coverSrc: string;
    title: string;
}

interface OverlayDomRefs {
    closeButton: HTMLButtonElement;
    dialog: HTMLDialogElement;
    queryInput: HTMLInputElement;
    results: HTMLElement;
}

interface OverlayState {
    activeIndex: number;
    onPick(bookId: string): void;
    options: TodayAddBookOption[];
}

let state: OverlayState | null = null;

function lowerText(value: string): string {
    return String(value || EMPTY_TEXT).trim().toLowerCase();
}

function createDialogShell(): HTMLDialogElement {
    const DIALOG = document.createElement("dialog");
    DIALOG.id = DIALOG_ID;
    DIALOG.className = "today-add-dialog";
    DIALOG.innerHTML = `
      <form class="today-add-dialog-form" method="dialog">
        <header class="today-add-dialog-header">
          <h2 class="today-add-title">Add Book To Today</h2>
          <p class="today-add-subtitle">Type to filter your library, then pick a book.</p>
        </header>
        <label class="today-add-query-label" for="${QUERY_INPUT_ID}">Search library</label>
        <input id="${QUERY_INPUT_ID}" class="today-add-query" type="search" autocomplete="off" placeholder="Start typing a title" />
        <div id="${RESULTS_ID}" class="today-add-results" role="listbox" aria-label="Books to add"></div>
        <footer class="today-add-footer">
          <button id="${CLOSE_BUTTON_ID}" class="btn" type="button">Cancel</button>
        </footer>
      </form>
    `;
    document.body.append(DIALOG);
    return DIALOG;
}

function ensureDialogShell(): HTMLDialogElement {
    const EXISTING = document.getElementById(DIALOG_ID);
    if (EXISTING instanceof HTMLDialogElement) {
        return EXISTING;
    }
    return createDialogShell();
}

function overlayRefs(): OverlayDomRefs {
    const DIALOG = ensureDialogShell();
    return {
        closeButton: el<HTMLButtonElement>(CLOSE_BUTTON_ID),
        dialog: DIALOG,
        queryInput: el<HTMLInputElement>(QUERY_INPUT_ID),
        results: el<HTMLElement>(RESULTS_ID),
    };
}

function currentState(): OverlayState {
    if (state === null) {
        throw new Error("Today add overlay state is not initialized.");
    }
    return state;
}

function visibleOptions(queryInput: HTMLInputElement): TodayAddBookOption[] {
    const QUERY = lowerText(queryInput.value);
    const OPTIONS = currentState().options;
    return OPTIONS.filter((option) => {
        if (QUERY === EMPTY_TEXT) {
            return true;
        }
        return lowerText(option.title).includes(QUERY);
    });
}

function noResultsRow(): HTMLElement {
    const ROW = document.createElement("p");
    ROW.className = "today-add-empty";
    ROW.textContent = NO_RESULTS_TEXT;
    return ROW;
}

function optionCover(option: TodayAddBookOption): HTMLElement {
    if (option.coverSrc !== EMPTY_TEXT) {
        const IMG = document.createElement("img");
        IMG.className = "today-add-cover";
        IMG.src = option.coverSrc;
        IMG.alt = EMPTY_TEXT;
        return IMG;
    }
    const FALLBACK = document.createElement("span");
    FALLBACK.className = "today-add-cover today-add-cover-fallback";
    FALLBACK.textContent = option.title.slice(0, 1).toUpperCase() || "+";
    return FALLBACK;
}

function pickAndClose(refs: OverlayDomRefs, bookId: string): void {
    currentState().onPick(bookId);
    refs.dialog.close();
}

function rowNode(
    refs: OverlayDomRefs,
    option: TodayAddBookOption,
    isActive: boolean,
): HTMLButtonElement {
    const ROW = document.createElement("button");
    ROW.type = "button";
    ROW.className = "today-add-option";
    ROW.dataset.bookId = option.bookId;
    ROW.classList.toggle("is-active", isActive);
    ROW.setAttribute("aria-selected", String(isActive));
    ROW.append(optionCover(option));

    const TITLE = document.createElement("span");
    TITLE.className = "today-add-option-title";
    TITLE.textContent = option.title;
    ROW.append(TITLE);

    ROW.onclick = () => {
        pickAndClose(refs, option.bookId);
    };
    return ROW;
}


function normalizedActiveIndex(activeIndex: number, total: number): number {
    if (total <= 0) {
        return -1;
    }
    if (activeIndex < 0) {
        return 0;
    }
    if (activeIndex >= total) {
        return total - 1;
    }
    return activeIndex;
}

function renderRows(refs: OverlayDomRefs): void {
    const VISIBLE = visibleOptions(refs.queryInput);
    if (VISIBLE.length === 0) {
        refs.results.replaceChildren(noResultsRow());
        return;
    }
    const ACTIVE_INDEX = normalizedActiveIndex(currentState().activeIndex, VISIBLE.length);
    const NODES = VISIBLE.map((option, index) => {
        return rowNode(refs, option, index === ACTIVE_INDEX);
    });
    refs.results.replaceChildren(...NODES);
}

function movedIndex(activeIndex: number, delta: number, total: number): number {
    if (total <= 0) {
        return -1;
    }
    const CANDIDATE = activeIndex + delta;
    if (CANDIDATE < 0) {
        return total - 1;
    }
    if (CANDIDATE >= total) {
        return 0;
    }
    return CANDIDATE;
}

function selectActive(refs: OverlayDomRefs): void {
    const VISIBLE = visibleOptions(refs.queryInput);
    const INDEX = normalizedActiveIndex(currentState().activeIndex, VISIBLE.length);
    const ACTIVE = VISIBLE[INDEX];
    if (ACTIVE === undefined) {
        return;
    }
    pickAndClose(refs, ACTIVE.bookId);
}

function handleArrowDown(refs: OverlayDomRefs, event: KeyboardEvent): void {
    event.preventDefault();
    const VISIBLE = visibleOptions(refs.queryInput);
    const NEXT_INDEX = movedIndex(currentState().activeIndex, 1, VISIBLE.length);
    state = { ...currentState(), activeIndex: NEXT_INDEX };
    renderRows(refs);
}

function handleArrowUp(refs: OverlayDomRefs, event: KeyboardEvent): void {
    event.preventDefault();
    const VISIBLE = visibleOptions(refs.queryInput);
    const NEXT_INDEX = movedIndex(currentState().activeIndex, -1, VISIBLE.length);
    state = { ...currentState(), activeIndex: NEXT_INDEX };
    renderRows(refs);
}

function handleQueryInput(refs: OverlayDomRefs): void {
    state = { ...currentState(), activeIndex: 0 };
    renderRows(refs);
}

function handleQueryKeydown(refs: OverlayDomRefs, event: KeyboardEvent): void {
    if (event.key === "ArrowDown") {
        handleArrowDown(refs, event);
        return;
    }
    if (event.key === "ArrowUp") {
        handleArrowUp(refs, event);
        return;
    }
    if (event.key === "Enter") {
        event.preventDefault();
        selectActive(refs);
        return;
    }
    if (event.key === "Escape") {
        refs.dialog.close();
    }
}

function openDialog(dialog: HTMLDialogElement): void {
    if (!dialog.open) {
        dialog.showModal();
    }
}

function bindOverlayHandlers(refs: OverlayDomRefs): void {
    const CLOSE_BUTTON = refs.closeButton;
    const QUERY_INPUT = refs.queryInput;
    CLOSE_BUTTON.onclick = () => {
        refs.dialog.close();
    };
    QUERY_INPUT.oninput = () => {
        handleQueryInput(refs);
    };
    QUERY_INPUT.onkeydown = (event) => {
        handleQueryKeydown(refs, event);
    };
}

export function openTodayAddBookOverlay(args: {
    onPick(bookId: string): void;
    options: TodayAddBookOption[];
}): void {
    const REFS = overlayRefs();
    state = {
        activeIndex: 0,
        onPick: args.onPick,
        options: args.options,
    };

    bindOverlayHandlers(REFS);
    REFS.queryInput.value = EMPTY_TEXT;
    state = { ...currentState(), activeIndex: 0 };
    renderRows(REFS);

    openDialog(REFS.dialog);
    REFS.queryInput.focus();
}

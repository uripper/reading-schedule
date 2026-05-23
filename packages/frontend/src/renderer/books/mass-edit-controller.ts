import type { Book, BookMassEditOptions } from "../../types/types.ts";

const MASS_EDIT_BUTTON_ID = "booksMassEditBtn";
const FLOATING_BUTTON_ID = "booksMassEditFloatingBtn";
const ACTIVE_CLASS = "is-mass-editing";
const SELECTED_LABEL_SINGLE = "Edit 1 Book";
const INACTIVE_LABEL = "Mass Edit";
const ACTIVE_LABEL = "Cancel Mass Edit";

interface MassEditState {
    active: boolean;
    selectedBookIds: Set<string>;
    visibleBookIds: string[];
}

export interface MassEditController extends BookMassEditOptions {
    syncVisibleBooks(books: Book[]): void;
}

interface CreateMassEditControllerArgs {
    onBulkEdit(bookIds: string[]): void;
    onSingleEdit(bookId: string, navigationBookIds: string[]): void;
    rerender(): void;
    toolbar: HTMLElement;
}

function bookId(book: Book): string {
    return String(book.book_id || "");
}

function ensureToolbarButton(toolbar: HTMLElement): HTMLButtonElement {
    const EXISTING = document.getElementById(MASS_EDIT_BUTTON_ID);
    if (EXISTING instanceof HTMLButtonElement) {
        return EXISTING;
    }
    const BUTTON = document.createElement("button");
    BUTTON.id = MASS_EDIT_BUTTON_ID;
    BUTTON.type = "button";
    BUTTON.className = "btn books-mass-edit-btn";
    BUTTON.textContent = INACTIVE_LABEL;
    toolbar.insertBefore(BUTTON, toolbar.children[1] ?? null);
    return BUTTON;
}

function ensureFloatingButton(): HTMLButtonElement {
    const EXISTING = document.getElementById(FLOATING_BUTTON_ID);
    if (EXISTING instanceof HTMLButtonElement) {
        return EXISTING;
    }
    const BUTTON = document.createElement("button");
    BUTTON.id = FLOATING_BUTTON_ID;
    BUTTON.type = "button";
    BUTTON.className = "btn books-mass-edit-floating";
    BUTTON.hidden = true;
    document.body.append(BUTTON);
    return BUTTON;
}

function selectedVisibleBookIds(state: MassEditState): string[] {
    return state.visibleBookIds.filter((bookIdValue) => {
        return state.selectedBookIds.has(bookIdValue);
    });
}

function floatingLabel(count: number): string {
    if (count === 1) {
        return SELECTED_LABEL_SINGLE;
    }
    return `Edit ${count} Books`;
}

function updateButtons(
    state: MassEditState,
    toolbarButton: HTMLButtonElement,
    floatingButton: HTMLButtonElement,
): void {
    const SELECTED_COUNT = selectedVisibleBookIds(state).length;
    const TOOLBAR_BUTTON = toolbarButton;
    const FLOATING_BUTTON = floatingButton;
    TOOLBAR_BUTTON.textContent = INACTIVE_LABEL;
    if (state.active) {
        TOOLBAR_BUTTON.textContent = ACTIVE_LABEL;
    }
    TOOLBAR_BUTTON.classList.toggle(ACTIVE_CLASS, state.active);
    FLOATING_BUTTON.hidden = !state.active || SELECTED_COUNT === 0;
    FLOATING_BUTTON.textContent = floatingLabel(SELECTED_COUNT);
}

function pruneHiddenSelections(state: MassEditState): void {
    const VISIBLE_IDS = new Set(state.visibleBookIds);
    for (const BOOK_ID of Array.from(state.selectedBookIds)) {
        if (!VISIBLE_IDS.has(BOOK_ID)) {
            state.selectedBookIds.delete(BOOK_ID);
        }
    }
}

function setActive(
    state: MassEditState,
    active: boolean,
    rerender: () => void,
): void {
    const NEXT_STATE = state;
    NEXT_STATE.active = active;
    if (!active) {
        NEXT_STATE.selectedBookIds.clear();
    }
    rerender();
}

function toggleSelection(
    state: MassEditState,
    bookIdValue: string,
    selected: boolean,
): void {
    if (selected) {
        state.selectedBookIds.add(bookIdValue);
        return;
    }
    state.selectedBookIds.delete(bookIdValue);
}

function submitSelection(
    state: MassEditState,
    args: CreateMassEditControllerArgs,
): void {
    const IDS = selectedVisibleBookIds(state);
    if (IDS.length === 0) {
        return;
    }
    setActive(state, false, args.rerender);
    if (IDS.length === 1) {
        args.onSingleEdit(IDS[0] ?? "", state.visibleBookIds);
        return;
    }
    args.onBulkEdit(IDS);
}

function createMassEditState(): MassEditState {
    return {
        active: false,
        selectedBookIds: new Set(),
        visibleBookIds: [],
    };
}

function bindMassEditButtons(options: {
    args: CreateMassEditControllerArgs;
    floatingButton: HTMLButtonElement;
    state: MassEditState;
    toolbarButton: HTMLButtonElement;
}): void {
    const STATE = options.state;
    const TOOLBAR_BUTTON = options.toolbarButton;
    const FLOATING_BUTTON = options.floatingButton;
    TOOLBAR_BUTTON.onclick = (): void => {
        setActive(STATE, !STATE.active, options.args.rerender);
    };
    FLOATING_BUTTON.onclick = (): void => {
        submitSelection(STATE, options.args);
    };
}

function massEditControllerApi(
    state: MassEditState,
    toolbarButton: HTMLButtonElement,
    floatingButton: HTMLButtonElement,
): MassEditController {
    const STATE = state;
    return {
        get active(): boolean {
            return STATE.active;
        },
        onBookSelectionChange(bookIdValue, selected): void {
            toggleSelection(STATE, bookIdValue, selected);
            updateButtons(STATE, toolbarButton, floatingButton);
        },
        get selectedBookIds(): ReadonlySet<string> {
            return new Set(STATE.selectedBookIds);
        },
        syncVisibleBooks(books: Book[]): void {
            STATE.visibleBookIds = books.map(bookId).filter(Boolean);
            pruneHiddenSelections(STATE);
            updateButtons(STATE, toolbarButton, floatingButton);
        },
    };
}

export function createMassEditController(
    args: CreateMassEditControllerArgs,
): MassEditController {
    const STATE = createMassEditState();
    const TOOLBAR_BUTTON = ensureToolbarButton(args.toolbar);
    const FLOATING_BUTTON = ensureFloatingButton();
    bindMassEditButtons({
        args,
        floatingButton: FLOATING_BUTTON,
        state: STATE,
        toolbarButton: TOOLBAR_BUTTON,
    });
    return massEditControllerApi(STATE, TOOLBAR_BUTTON, FLOATING_BUTTON);
}

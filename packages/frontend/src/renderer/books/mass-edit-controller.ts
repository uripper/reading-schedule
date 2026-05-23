import type { Book, BookMassEditOptions } from "../../types/types.ts";

const ADD_VISIBLE_BUTTON_ID = "booksMassEditAddVisibleBtn";
const MASS_EDIT_BUTTON_ID = "booksMassEditBtn";
const FLOATING_BUTTON_ID = "booksMassEditFloatingBtn";
const ACTIVE_CLASS = "is-mass-editing";
const ADD_VISIBLE_LABEL_SINGLE = "Add 1 Book";
const SELECTED_LABEL_SINGLE = "Edit 1 Book";
const INACTIVE_LABEL = "Mass Edit";
const ACTIVE_LABEL = "Cancel Mass Edit";

interface MassEditState {
    active: boolean;
    selectedBookIds: Set<string>;
    visibleBookIds: string[];
}

interface MassEditButtons {
    addVisible: HTMLButtonElement;
    floating: HTMLButtonElement;
    toolbar: HTMLButtonElement;
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

function toolbarActions(toolbar: HTMLElement): HTMLElement {
    const EXISTING = toolbar.querySelector<HTMLElement>(
        ".books-toolbar-actions",
    );
    if (EXISTING instanceof HTMLElement) {
        return EXISTING;
    }
    return toolbar;
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
    toolbar.append(BUTTON);
    return BUTTON;
}

function ensureAddVisibleButton(toolbar: HTMLElement): HTMLButtonElement {
    const EXISTING = document.getElementById(ADD_VISIBLE_BUTTON_ID);
    if (EXISTING instanceof HTMLButtonElement) {
        return EXISTING;
    }
    const BUTTON = document.createElement("button");
    BUTTON.id = ADD_VISIBLE_BUTTON_ID;
    BUTTON.type = "button";
    BUTTON.className = "btn books-mass-edit-add-btn";
    BUTTON.hidden = true;
    toolbar.append(BUTTON);
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

function addVisibleLabel(count: number): string {
    if (count === 1) {
        return ADD_VISIBLE_LABEL_SINGLE;
    }
    return `Add ${count} Books`;
}

function allVisibleBooksSelected(state: MassEditState): boolean {
    if (state.visibleBookIds.length === 0) {
        return false;
    }
    return state.visibleBookIds.every((bookIdValue) => {
        return state.selectedBookIds.has(bookIdValue);
    });
}

function setToolbarButtonState(
    state: MassEditState,
    buttons: MassEditButtons,
): void {
    const TOOLBAR = buttons.toolbar;
    TOOLBAR.textContent = INACTIVE_LABEL;
    if (state.active) {
        TOOLBAR.textContent = ACTIVE_LABEL;
    }
    TOOLBAR.classList.toggle(ACTIVE_CLASS, state.active);
}

function setAddVisibleButtonState(
    state: MassEditState,
    buttons: MassEditButtons,
): void {
    const ADD_VISIBLE = buttons.addVisible;
    const VISIBLE_COUNT = state.visibleBookIds.length;
    ADD_VISIBLE.hidden = !state.active || VISIBLE_COUNT === 0;
    ADD_VISIBLE.disabled = allVisibleBooksSelected(state);
    ADD_VISIBLE.textContent = addVisibleLabel(VISIBLE_COUNT);
}

function setFloatingButtonState(
    state: MassEditState,
    buttons: MassEditButtons,
): void {
    const FLOATING = buttons.floating;
    const SELECTED_COUNT = selectedVisibleBookIds(state).length;
    FLOATING.hidden = !state.active || SELECTED_COUNT === 0;
    FLOATING.textContent = floatingLabel(SELECTED_COUNT);
}

function updateButtons(state: MassEditState, buttons: MassEditButtons): void {
    setToolbarButtonState(state, buttons);
    setAddVisibleButtonState(state, buttons);
    setFloatingButtonState(state, buttons);
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

function addVisibleBooks(state: MassEditState): void {
    for (const BOOK_ID of state.visibleBookIds) {
        state.selectedBookIds.add(BOOK_ID);
    }
}

function handleBookSelectionChange(options: {
    bookIdValue: string;
    buttons: MassEditButtons;
    selected: boolean;
    state: MassEditState;
}): void {
    toggleSelection(options.state, options.bookIdValue, options.selected);
    updateButtons(options.state, options.buttons);
}

function syncVisibleState(
    state: MassEditState,
    buttons: MassEditButtons,
    books: Book[],
): void {
    const NEXT_STATE = state;
    NEXT_STATE.visibleBookIds = books.map(bookId).filter(Boolean);
    pruneHiddenSelections(NEXT_STATE);
    updateButtons(NEXT_STATE, buttons);
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
    buttons: MassEditButtons;
    state: MassEditState;
}): void {
    const STATE = options.state;
    options.buttons.toolbar.onclick = (): void => {
        setActive(STATE, !STATE.active, options.args.rerender);
    };
    options.buttons.addVisible.onclick = (): void => {
        addVisibleBooks(STATE);
        options.args.rerender();
    };
    options.buttons.floating.onclick = (): void => {
        submitSelection(STATE, options.args);
    };
}

function massEditControllerApi(
    state: MassEditState,
    buttons: MassEditButtons,
): MassEditController {
    const STATE = state;
    return {
        get active(): boolean {
            return STATE.active;
        },
        onBookSelectionChange(bookIdValue, selected): void {
            handleBookSelectionChange({
                bookIdValue,
                buttons,
                selected,
                state: STATE,
            });
        },
        get selectedBookIds(): ReadonlySet<string> {
            return new Set(STATE.selectedBookIds);
        },
        syncVisibleBooks(books: Book[]): void {
            syncVisibleState(STATE, buttons, books);
        },
    };
}

export function createMassEditController(
    args: CreateMassEditControllerArgs,
): MassEditController {
    const STATE = createMassEditState();
    const TOOLBAR_ACTIONS = toolbarActions(args.toolbar);
    const BUTTONS: MassEditButtons = {
        addVisible: ensureAddVisibleButton(TOOLBAR_ACTIONS),
        floating: ensureFloatingButton(),
        toolbar: ensureToolbarButton(TOOLBAR_ACTIONS),
    };
    bindMassEditButtons({
        args,
        buttons: BUTTONS,
        state: STATE,
    });
    return massEditControllerApi(STATE, BUTTONS);
}

/**
 * Keyboard handling for the collection combobox: arrows move the highlight,
 * Enter adds, Escape closes, and Backspace on an empty search removes the last
 * chip.
 */
import type { BookFormRefs } from "../../types/types.ts";
import {
    chooseCollectionOption,
    collectionPickerState,
    readCollectionSelection,
    removeCollectionFromForm,
    setCollectionOptionsOpen,
} from "./collection_picker.ts";
import {
    NO_ACTIVE_OPTION,
    renderCollectionResults,
} from "./collection_picker_render.ts";

const STEP_DOWN = 1;
const STEP_UP = -1;
const FIRST_OPTION = 0;

/**
 * Finds the option the highlight moves to, wrapping at either end. With no
 * highlight yet, Arrow Down lands on the first option and Arrow Up on the last.
 * @param activeIndex - Currently highlighted option, or `NO_ACTIVE_OPTION`.
 * @param step - `1` for down, `-1` for up.
 * @param count - Number of listed options; must be positive.
 * @returns Next highlighted option position.
 */
function nextActiveIndex(
    activeIndex: number,
    step: number,
    count: number,
): number {
    if (activeIndex !== NO_ACTIVE_OPTION) {
        return (((activeIndex + step) % count) + count) % count;
    }
    if (step === STEP_UP) {
        return count - 1;
    }
    return FIRST_OPTION;
}

/**
 * Moves the highlight through the options and opens the dropdown when it was
 * closed. Reopening that already highlights a match counts as the move, so the
 * first arrow press never skips the top suggestion.
 * @param refs - Book form references for the collection controls.
 * @param step - `1` for down, `-1` for up.
 */
function moveHighlight(refs: BookFormRefs, step: number): void {
    const STATE = collectionPickerState(refs);
    if (!STATE.open) {
        setCollectionOptionsOpen(refs, true);
        if (STATE.activeIndex !== NO_ACTIVE_OPTION) {
            return;
        }
    }
    const COUNT = STATE.options.length;
    if (COUNT === 0) {
        return;
    }
    STATE.activeIndex = nextActiveIndex(STATE.activeIndex, step, COUNT);
    renderCollectionResults(refs, STATE);
}

/**
 * Adds the highlighted option. Enter never submits the book form from here.
 * @param refs - Book form references for the collection controls.
 * @param event - Enter key event.
 */
function onEnter(refs: BookFormRefs, event: KeyboardEvent): void {
    event.preventDefault();
    const STATE = collectionPickerState(refs);
    if (!STATE.open) {
        return;
    }
    chooseCollectionOption(refs, STATE.activeIndex);
}

/**
 * Closes an open dropdown without closing the book dialog.
 * @param refs - Book form references for the collection controls.
 * @param event - Escape key event.
 */
function onEscape(refs: BookFormRefs, event: KeyboardEvent): void {
    if (!collectionPickerState(refs).open) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    setCollectionOptionsOpen(refs, false);
}

/**
 * Removes the last chip when Backspace is pressed in an empty search.
 * @param refs - Book form references for the collection controls.
 */
function onBackspace(refs: BookFormRefs): void {
    if (refs.collectionInput.value !== "") {
        return;
    }
    const LAST = readCollectionSelection(refs).at(-1);
    if (LAST !== undefined) {
        removeCollectionFromForm(refs, LAST);
    }
}

const KEY_HANDLERS: Partial<
    Record<string, (refs: BookFormRefs, event: KeyboardEvent) => void>
> = {
    ArrowDown: (refs, event) => {
        event.preventDefault();
        moveHighlight(refs, STEP_DOWN);
    },
    ArrowUp: (refs, event) => {
        event.preventDefault();
        moveHighlight(refs, STEP_UP);
    },
    Backspace: onBackspace,
    Enter: onEnter,
    Escape: onEscape,
};

/**
 * Routes a key press in the collection search to its handler, if any.
 * @param refs - Book form references for the collection controls.
 * @param event - Keydown event from the search box.
 */
export function handleCollectionKey(
    refs: BookFormRefs,
    event: KeyboardEvent,
): void {
    KEY_HANDLERS[event.key]?.(refs, event);
}

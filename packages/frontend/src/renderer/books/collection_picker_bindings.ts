/**
 * Keyboard and pointer handling for the collection combobox: arrows move the
 * highlight, Enter adds, Escape closes, Backspace on an empty search removes the
 * last chip, and clicking a chip removes that collection.
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
    CHIP_CLASS,
    CHIP_NAME_KEY,
    NO_ACTIVE_OPTION,
    OPTION_INDEX_KEY,
    renderCollectionResults,
} from "./collection_picker_render.ts";

const STEP_DOWN = 1;
const STEP_UP = -1;

/**
 * Moves the highlight through the options, wrapping at either end, and opens
 * the dropdown when it was closed.
 * @param refs - Book form references for the collection controls.
 * @param step - `1` for down, `-1` for up.
 */
function moveHighlight(refs: BookFormRefs, step: number): void {
    const STATE = collectionPickerState(refs);
    if (!STATE.open) {
        setCollectionOptionsOpen(refs, true);
    }
    const COUNT = STATE.options.length;
    if (COUNT === 0) {
        return;
    }
    const START = Math.max(STATE.activeIndex, NO_ACTIVE_OPTION);
    STATE.activeIndex = (((START + step) % COUNT) + COUNT) % COUNT;
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
 * Reads the option position from a pointer event inside the dropdown.
 * @param event - Pointer event from the option list.
 * @returns Option position, or `null` outside any option.
 */
function eventOptionIndex(event: Event): number | null {
    if (!(event.target instanceof HTMLElement)) {
        return null;
    }
    const OPTION = event.target.closest<HTMLElement>(".book-result");
    const INDEX = OPTION?.dataset[OPTION_INDEX_KEY];
    if (INDEX === undefined) {
        return null;
    }
    return Number(INDEX);
}

/**
 * Opens the dropdown on focus, click, and typing, and routes special keys.
 * @param refs - Book form references for the collection controls.
 */
function bindInputEvents(refs: BookFormRefs): void {
    const OPEN = (): void => {
        setCollectionOptionsOpen(refs, true);
    };
    refs.collectionInput.addEventListener("focus", OPEN);
    refs.collectionInput.addEventListener("click", OPEN);
    refs.collectionInput.addEventListener("input", OPEN);
    refs.collectionInput.addEventListener("keydown", (event) => {
        KEY_HANDLERS[event.key]?.(refs, event);
    });
}

/**
 * Adds clicked options while keeping focus in the search box.
 * @param refs - Book form references for the collection controls.
 */
function bindResultEvents(refs: BookFormRefs): void {
    refs.collectionResults.addEventListener("mousedown", (event) => {
        event.preventDefault();
    });
    refs.collectionResults.addEventListener("mousemove", (event) => {
        const INDEX = eventOptionIndex(event);
        const STATE = collectionPickerState(refs);
        if (INDEX === null || INDEX === STATE.activeIndex) {
            return;
        }
        STATE.activeIndex = INDEX;
        renderCollectionResults(refs, STATE);
    });
    refs.collectionResults.addEventListener("click", (event) => {
        const INDEX = eventOptionIndex(event);
        if (INDEX !== null) {
            chooseCollectionOption(refs, INDEX);
            refs.collectionInput.focus();
        }
    });
}

/**
 * Removes a collection when its chip is clicked.
 * @param refs - Book form references for the collection controls.
 */
function bindChipEvents(refs: BookFormRefs): void {
    refs.collectionChips.addEventListener("click", (event) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        const CHIP = event.target.closest<HTMLElement>(`.${CHIP_CLASS}`);
        const NAME = CHIP?.dataset[CHIP_NAME_KEY];
        if (NAME !== undefined) {
            removeCollectionFromForm(refs, NAME);
            refs.collectionInput.focus();
        }
    });
}

/**
 * Checks whether a click came from the combobox, its options, or its chips.
 * The event path is used because choosing an option or chip redraws it, which
 * detaches the clicked element before the click reaches the document.
 * @param refs - Book form references for the collection controls.
 * @param event - Document click event.
 * @returns `true` when the click belongs to the collection picker.
 */
function isPickerClick(refs: BookFormRefs, event: MouseEvent): boolean {
    const PATH = event.composedPath();
    return [
        refs.collectionInput,
        refs.collectionResults,
        refs.collectionChips,
    ].some((element) => PATH.includes(element));
}

/**
 * Closes the dropdown when the user clicks anywhere else.
 * @param refs - Book form references for the collection controls.
 */
function bindOutsideClick(refs: BookFormRefs): void {
    document.addEventListener("click", (event) => {
        if (!collectionPickerState(refs).open || isPickerClick(refs, event)) {
            return;
        }
        setCollectionOptionsOpen(refs, false);
    });
}

/**
 * Binds every collection combobox interaction.
 * @param refs - Book form references for the collection controls.
 */
export function bindCollectionPicker(refs: BookFormRefs): void {
    bindInputEvents(refs);
    bindResultEvents(refs);
    bindChipEvents(refs);
    bindOutsideClick(refs);
}

/**
 * Pointer and focus handling for the collection combobox: focus, clicks, and
 * typing open the menu, clicking a row applies it, clicking a chip removes
 * that collection, clicking the field's empty space focuses the search, and
 * clicking elsewhere or tabbing away closes the menu. Keys are handled in
 * `collection_picker_keys.ts`.
 */
import type { BookFormRefs } from "../../types/types.ts";
import {
    collectionPickerState,
    removeCollectionFromForm,
    setCollectionOptionsOpen,
} from "./collection_picker.ts";
import { chooseCollectionOption } from "./collection_picker_choose.ts";
import { handleCollectionKey } from "./collection_picker_keys.ts";
import {
    CHIP_CLASS,
    CHIP_NAME_KEY,
    OPTION_INDEX_KEY,
    renderCollectionResults,
} from "./collection_picker_render.ts";

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
        handleCollectionKey(refs, event);
    });
    refs.collectionInput.addEventListener("blur", () => {
        if (collectionPickerState(refs).open) {
            setCollectionOptionsOpen(refs, false);
        }
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
    refs.collectionChips.parentElement?.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) {
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
        refs.collectionsField,
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

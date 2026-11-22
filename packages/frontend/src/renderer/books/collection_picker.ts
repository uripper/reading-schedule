/**
 * Book-form collection picker. A searchable dropdown adds existing or new
 * collections, and the book's collections sit underneath as removable chips,
 * which are the source of truth for what gets saved.
 */
import type {
    Book,
    BookFormRefs,
    CollectionPickerState,
} from "../../types/types.ts";
import {
    compareCollectionNames,
    normalizeCollectionName,
    normalizeCollections,
    uniqueCollections,
} from "./collection.ts";
import {
    canonicalCollectionName,
    collectionOptions,
    includesCollectionName,
} from "./collection_options.ts";
import {
    CHIP_CLASS,
    CHIP_NAME_KEY,
    NO_ACTIVE_OPTION,
    renderCollectionChips,
    renderCollectionResults,
} from "./collection_picker_render.ts";

const FIRST_OPTION = 0;
const STATE_BY_FIELD = new WeakMap<HTMLElement, CollectionPickerState>();

/**
 * Returns the picker state for this form, creating it on first use.
 * @param refs - Book form references for the collection controls.
 * @returns Mutable picker state.
 */
export function collectionPickerState(
    refs: BookFormRefs,
): CollectionPickerState {
    const EXISTING = STATE_BY_FIELD.get(refs.collectionInput);
    if (EXISTING !== undefined) {
        return EXISTING;
    }
    const STATE: CollectionPickerState = {
        activeIndex: NO_ACTIVE_OPTION,
        available: [],
        initial: [],
        open: false,
        options: [],
    };
    STATE_BY_FIELD.set(refs.collectionInput, STATE);
    return STATE;
}

/**
 * Reads the collections currently shown as chips.
 * @param refs - Book form references for the collection controls.
 * @returns Distinct sorted collection names.
 */
export function readCollectionSelection(refs: BookFormRefs): string[] {
    const CHIPS = Array.from(
        refs.collectionChips.querySelectorAll<HTMLElement>(`.${CHIP_CLASS}`),
    );
    return normalizeCollections(
        CHIPS.map((chip) => chip.dataset[CHIP_NAME_KEY]),
    );
}

/**
 * Picks the option highlighted after the list changes: the first match while
 * typing so Enter adds it, and none for an empty search.
 * @param refs - Book form references for the collection controls.
 * @param optionCount - Number of options now listed.
 * @returns Highlighted option position.
 */
function defaultActiveIndex(refs: BookFormRefs, optionCount: number): number {
    if (optionCount === 0 || refs.collectionInput.value.trim() === "") {
        return NO_ACTIVE_OPTION;
    }
    return FIRST_OPTION;
}

/**
 * Rebuilds the options for the typed text and redraws the dropdown.
 * @param refs - Book form references for the collection controls.
 */
export function refreshCollectionOptions(refs: BookFormRefs): void {
    const STATE = collectionPickerState(refs);
    STATE.options = collectionOptions(
        STATE.available,
        readCollectionSelection(refs),
        refs.collectionInput.value,
    );
    STATE.activeIndex = defaultActiveIndex(refs, STATE.options.length);
    renderCollectionResults(refs, STATE);
}

/**
 * Opens or closes the dropdown.
 * @param refs - Book form references for the collection controls.
 * @param open - Whether the option list should show.
 */
export function setCollectionOptionsOpen(
    refs: BookFormRefs,
    open: boolean,
): void {
    collectionPickerState(refs).open = open;
    refreshCollectionOptions(refs);
}

/**
 * Shows the book's collections and resets the search for a newly opened form.
 * @param refs - Book form references for the collection controls.
 * @param books - Library books used to list existing collections.
 * @param selected - Collections the book belongs to.
 */
export function renderCollectionPicker(
    refs: BookFormRefs,
    books: Book[],
    selected: string[],
): void {
    const FORM_REFS = refs;
    const STATE = collectionPickerState(FORM_REFS);
    STATE.available = uniqueCollections(books);
    STATE.initial = normalizeCollections(selected);
    FORM_REFS.collectionInput.value = "";
    renderCollectionChips(FORM_REFS, STATE.initial);
    setCollectionOptionsOpen(FORM_REFS, false);
}

/**
 * Adds a collection to the book, reusing an existing spelling of the name.
 * @param refs - Book form references for the collection controls.
 * @param rawName - Collection name chosen or typed by the user.
 */
export function addCollectionToForm(refs: BookFormRefs, rawName: string): void {
    const NAME = normalizeCollectionName(rawName);
    if (NAME === "") {
        return;
    }
    const FORM_REFS = refs;
    const STATE = collectionPickerState(FORM_REFS);
    const CANONICAL = canonicalCollectionName(STATE.available, NAME);
    if (!includesCollectionName(STATE.available, CANONICAL)) {
        STATE.available = normalizeCollections([...STATE.available, CANONICAL]);
    }
    const SELECTED = [...readCollectionSelection(FORM_REFS), CANONICAL];
    renderCollectionChips(FORM_REFS, normalizeCollections(SELECTED));
    FORM_REFS.collectionInput.value = "";
    refreshCollectionOptions(FORM_REFS);
}

/**
 * Removes a collection from the book.
 * @param refs - Book form references for the collection controls.
 * @param name - Collection to remove.
 */
export function removeCollectionFromForm(
    refs: BookFormRefs,
    name: string,
): void {
    const REMAINING = readCollectionSelection(refs).filter((selected) => {
        return compareCollectionNames(selected, name) !== 0;
    });
    renderCollectionChips(refs, REMAINING);
    refreshCollectionOptions(refs);
}

/**
 * Adds the option at a position, as when it is clicked or chosen with Enter.
 * @param refs - Book form references for the collection controls.
 * @param index - Option position.
 */
export function chooseCollectionOption(
    refs: BookFormRefs,
    index: number,
): void {
    const OPTION = collectionPickerState(refs).options[index];
    if (OPTION === undefined) {
        return;
    }
    addCollectionToForm(refs, OPTION.name);
}

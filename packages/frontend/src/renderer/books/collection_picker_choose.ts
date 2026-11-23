/**
 * Acts on a chosen collection row: an existing collection toggles in or out
 * of the book, `Create "<text>"` creates and selects the typed name, and
 * "New collection…" creates the typed name or, with nothing typed, asks for
 * one.
 */
import type { BookFormRefs, CollectionOption } from "../../types/types.ts";
import { normalizeCollectionName } from "./collection.ts";
import {
    addCollectionToForm,
    collectionPickerState,
    refreshCollectionOptions,
    removeCollectionFromForm,
} from "./collection_picker.ts";

const NAMING_PLACEHOLDER = "Name the new collection, then press Enter";

/**
 * Switches the field to naming a new collection.
 * @param refs - Book form references for the collection controls.
 */
function startNamingCollection(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    collectionPickerState(FORM_REFS).naming = true;
    FORM_REFS.collectionInput.value = "";
    FORM_REFS.collectionInput.placeholder = NAMING_PLACEHOLDER;
    refreshCollectionOptions(FORM_REFS);
}

/**
 * Handles the pinned "New collection…" row.
 * @param refs - Book form references for the collection controls.
 */
function chooseNewCollection(refs: BookFormRefs): void {
    const TYPED = normalizeCollectionName(refs.collectionInput.value);
    if (TYPED === "") {
        startNamingCollection(refs);
        return;
    }
    addCollectionToForm(refs, TYPED);
}

/**
 * Applies one row.
 * @param refs - Book form references for the collection controls.
 * @param option - Chosen row.
 */
function applyCollectionOption(
    refs: BookFormRefs,
    option: CollectionOption,
): void {
    if (option.kind === "new") {
        chooseNewCollection(refs);
        return;
    }
    if (option.selected) {
        removeCollectionFromForm(refs, option.name);
        return;
    }
    addCollectionToForm(refs, option.name);
}

/**
 * Applies the row at a position, as when it is clicked or chosen with Enter.
 * @param refs - Book form references for the collection controls.
 * @param index - Row position.
 */
export function chooseCollectionOption(
    refs: BookFormRefs,
    index: number,
): void {
    const OPTION = collectionPickerState(refs).options[index];
    if (OPTION === undefined) {
        return;
    }
    applyCollectionOption(refs, OPTION);
}

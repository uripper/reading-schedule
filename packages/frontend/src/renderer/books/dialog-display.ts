import type { BookFormRefs, OpenDialogOptions } from "../../types/types.ts";
import { restoreBulkEditPlaceholders } from "./bulk-edit-fill.ts";
import { setBookDialogIdleLabel } from "./dialog_submit.ts";

const BULK_FORM_CLASS = "is-bulk-book-form";
const BULK_SAVE_LABEL = "Save Books";
const SINGLE_SAVE_LABEL = "Save Book";

function fieldLabel(input: HTMLInputElement): HTMLElement | null {
    return input.closest<HTMLElement>("label");
}

function searchPanel(refs: BookFormRefs): HTMLElement | null {
    return refs.searchInput.closest<HTMLElement>(".book-search-panel");
}

function applyHiddenState(element: HTMLElement | null, hidden: boolean): void {
    if (element === null) {
        return;
    }
    const TARGET = element;
    TARGET.hidden = hidden;
}

function setInputDisabled(input: HTMLInputElement, disabled: boolean): void {
    const TARGET_INPUT = input;
    TARGET_INPUT.disabled = disabled;
}

function setProtectedFieldState(refs: BookFormRefs, bulkMode: boolean): void {
    applyHiddenState(searchPanel(refs), bulkMode);
    applyHiddenState(fieldLabel(refs.titleInput), bulkMode);
    applyHiddenState(refs.coverPanel, bulkMode);
    setInputDisabled(refs.titleInput, bulkMode);
    setInputDisabled(refs.searchInput, bulkMode);
    setInputDisabled(refs.coverUploadInput, bulkMode);
}

function setBulkOnlyFieldState(refs: BookFormRefs, bulkMode: boolean): void {
    const APPLY_DAYS =
        refs.applyScheduledDaysToShelfInput.closest<HTMLElement>("label");
    applyHiddenState(APPLY_DAYS, bulkMode);
}

export function isBulkDialogMode(options: OpenDialogOptions): boolean {
    if (options.mode === "bulk") {
        return true;
    }
    return (options.bulkBookIds?.length ?? 0) > 1;
}

export function applyBookDialogDisplayMode(
    refs: BookFormRefs,
    options: OpenDialogOptions,
): void {
    const BULK_MODE = isBulkDialogMode(options);
    refs.form.classList.toggle(BULK_FORM_CLASS, BULK_MODE);
    setProtectedFieldState(refs, BULK_MODE);
    setBulkOnlyFieldState(refs, BULK_MODE);
    if (!BULK_MODE) {
        restoreBulkEditPlaceholders(refs);
    }
    if (BULK_MODE) {
        setBookDialogIdleLabel(refs, BULK_SAVE_LABEL);
        return;
    }
    setBookDialogIdleLabel(refs, SINGLE_SAVE_LABEL);
}

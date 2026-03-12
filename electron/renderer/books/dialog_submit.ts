/**
 * Handles book-dialog submit orchestration, validation recovery, and save state UI.
 */
import type { BookFormRefs, BookSubmitPayload } from "../../types/types.js";
import { focusFirstError } from "../accessibility/index.js";
import { parseFormBook } from "./form_state.js";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";

const SCHEDULED_DAY_SELECTOR = 'input[type="checkbox"][data-book-weekday]';
const SAVE_BUTTON_IDLE_LABEL = "Save Book";
const SAVE_BUTTON_BUSY_LABEL = "Saving...";
const EMPTY_TEXT = "";

/**
 * Runs book save work while keeping busy-state cleanup consistent for sync and async failures.
 * @param flow - Submission steps and callbacks for the current dialog save attempt.
 */
function runBookDialogSubmitFlow(
    flow: Readonly<{
        createPayload(): BookSubmitPayload;
        onComplete(): void;
        onError(error: unknown): void;
        onSubmit(payload: BookSubmitPayload): Promise<void> | void;
        setSavingState(busy: boolean): void;
    }>,
): void {
    flow.setSavingState(true);
    let payload: BookSubmitPayload;
    try {
        payload = flow.createPayload();
    } catch (error: unknown) {
        flow.onError(error);
        flow.setSavingState(false);
        return;
    }
    Promise.resolve(flow.onSubmit(payload))
        .then(() => {
            flow.onComplete();
        })
        .catch((error: unknown) => {
            flow.onError(error);
        })
        .finally(() => {
            flow.setSavingState(false);
        });
}

/**
 * Restores the book dialog save button to its idle label and disabled state.
 * @param refs - Resolved DOM references for the book dialog.
 * @param busy - True while a save request is running.
 */
function setBookDialogSavingState(refs: BookFormRefs, busy: boolean): void {
    const SAVE_BUTTON = refs.saveBtn;
    SAVE_BUTTON.disabled = busy;
    SAVE_BUTTON.textContent = SAVE_BUTTON_IDLE_LABEL;
    if (busy) {
        SAVE_BUTTON.textContent = SAVE_BUTTON_BUSY_LABEL;
    }
}
/**
 * Converts unknown submit failures into safe user-visible message text.
 * @param error - Unknown error thrown during payload creation or save.
 * @returns User-visible message for the dialog metadata area.
 */
function saveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "Could not save this book.";
}

/**
 * Restores lookup metadata text from the stored lookup note.
 * @param refs - Resolved DOM references for the book dialog.
 */
function restoreLookupMetaText(refs: BookFormRefs): void {
    const LOOKUP_NOTE = refs.lookupMeta.dataset.lookupNote ?? EMPTY_TEXT;
    refs.lookupMeta.textContent = LOOKUP_NOTE;
}
/**
 * Returns the first scheduled-day checkbox input in the dialog when present.
 * @param refs - Resolved DOM references for the book dialog.
 * @returns First scheduled-day checkbox or `null` when unavailable.
 */
function firstScheduledDayInput(refs: BookFormRefs): HTMLInputElement | null {
    return refs.scheduledDaysField.querySelector<HTMLInputElement>(
        SCHEDULED_DAY_SELECTOR,
    );
}

/**
 * Returns true when the user has selected at least one scheduled day.
 * @param refs - Resolved DOM references for the book dialog.
 * @returns `true` when any weekday checkbox is checked.
 */
function hasSelectedScheduledDay(refs: BookFormRefs): boolean {
    const INPUTS = refs.scheduledDaysField.querySelectorAll<HTMLInputElement>(
        SCHEDULED_DAY_SELECTOR,
    );
    for (const INPUT of INPUTS) {
        if (INPUT.checked) {
            return true;
        }
    }
    return false;
}
/**
 * Focuses the most relevant custom-validation control when native validity does not identify one.
 * @param refs - Resolved DOM references for the book dialog.
 */
function focusCustomValidationTarget(refs: BookFormRefs): void {
    const MISSING_WORDS = refs.wordsInput.value.trim() === EMPTY_TEXT;
    const MISSING_PAGES_TOTAL =
        refs.pagesTotalInput.value.trim() === EMPTY_TEXT;
    if (MISSING_WORDS && MISSING_PAGES_TOTAL) {
        refs.wordsInput.focus();
        return;
    }
    if (!hasSelectedScheduledDay(refs)) {
        const FIRST_INPUT = firstScheduledDayInput(refs);
        FIRST_INPUT?.focus();
        return;
    }
    if (refs.shelfSelectInput.value === SHELF_SELECT_CREATE_NEW) {
        refs.shelfSelectInput.focus();
        return;
    }
    refs.titleInput.focus();
}

/**
 * Shows a submit failure message and moves focus to the best recovery target.
 * @param refs - Resolved DOM references for the book dialog.
 * @param error - Unknown error thrown during payload creation or save.
 */
function showSubmitError(refs: BookFormRefs, error: unknown): void {
    refs.lookupMeta.textContent = saveErrorMessage(error);
    if (focusFirstError(refs.form)) {
        return;
    }
    focusCustomValidationTarget(refs);
}
/**
 * Builds the current book dialog payload from live form controls.
 * @param refs - Resolved DOM references for the book dialog.
 * @returns Parsed payload ready for save handling.
 */
function createBookSubmitPayload(refs: BookFormRefs): BookSubmitPayload {
    return {
        applyScheduledDaysToShelf: refs.applyScheduledDaysToShelfInput.checked,
        book: parseFormBook(refs),
    };
}

/**
 * Resets submit-related UI so the dialog opens in an editable, non-busy state.
 * @param refs - Resolved DOM references for the book dialog.
 */
export function resetBookDialogSubmitState(refs: BookFormRefs): void {
    restoreLookupMetaText(refs);
    setBookDialogSavingState(refs, false);
}

/**
 * Binds the book form submit event to payload parsing and save orchestration.
 * @param form - Dialog form element that dispatches submit events.
 * @param refs - Resolved DOM references for the book dialog.
 * @param onSubmit - Callback invoked with the parsed form payload on submit.
 * @param onComplete - Callback invoked after a successful save.
 */
export function bindBookDialogSubmit(
    form: HTMLFormElement,
    refs: BookFormRefs,
    onSubmit: (payload: BookSubmitPayload) => Promise<void> | void,
    onComplete: () => void,
): void {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        restoreLookupMetaText(refs);
        runBookDialogSubmitFlow({
            createPayload() {
                return createBookSubmitPayload(refs);
            },
            onComplete,
            onError(error: unknown) {
                showSubmitError(refs, error);
            },
            onSubmit,
            setSavingState(busy: boolean) {
                setBookDialogSavingState(refs, busy);
            },
        });
    });
}

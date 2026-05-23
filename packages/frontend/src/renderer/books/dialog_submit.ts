/**
 * Handles book-dialog submit orchestration, validation recovery, and save state UI.
 */
import type {
    BookDialogSubmitPayload,
    BookFormRefs,
    BookSubmitPayload,
} from "../../types/types.ts";
import { focusFirstError } from "../accessibility/a11y.ts";
import { parseFormBook } from "./form-state.ts";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.ts";

const SCHEDULED_DAY_SELECTOR = 'input[type="checkbox"][data-book-weekday]';
const SAVE_BUTTON_IDLE_LABEL = "Save Book";
const SAVE_BUTTON_BUSY_LABEL = "Saving...";
const EMPTY_TEXT = "";

type BookDialogSubmitFlow = Readonly<{
    createPayload(): BookDialogSubmitPayload;
    onComplete(): void;
    onError(error: unknown): void;
    onSubmit(payload: BookDialogSubmitPayload): Promise<void> | void;
    setSavingState(busy: boolean): void;
}>;

type BindBookDialogSubmitArgs = {
    form: HTMLFormElement;
    refs: BookFormRefs;
    createPayload?: () => BookDialogSubmitPayload;
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
    onComplete: () => void;
};

function submitBookDialogFlowPayload(
    flow: BookDialogSubmitFlow,
    payload: BookDialogSubmitPayload,
): void {
    Promise.resolve()
        .then(() => {
            return flow.onSubmit(payload);
        })
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
 * Runs book save work while keeping busy-state cleanup consistent for sync and async failures.
 * @param flow - Submission steps and callbacks for the current dialog save attempt.
 */
function runBookDialogSubmitFlow(flow: BookDialogSubmitFlow): void {
    flow.setSavingState(true);
    try {
        submitBookDialogFlowPayload(flow, flow.createPayload());
    } catch (error: unknown) {
        flow.onError(error);
        flow.setSavingState(false);
    }
}

/**
 * Updates the book dialog save button for busy or idle submit state.
 * @param refs - Resolved DOM references for the book dialog.
 * @param busy - True while a save request is running.
 */
function setBookDialogSavingState(refs: BookFormRefs, busy: boolean): void {
    const SAVE_BUTTON = refs.saveBtn;
    SAVE_BUTTON.disabled = busy;
    SAVE_BUTTON.textContent = SAVE_BUTTON_IDLE_LABEL;
    if (SAVE_BUTTON.dataset?.idleLabel !== undefined) {
        SAVE_BUTTON.textContent = SAVE_BUTTON.dataset.idleLabel;
    }
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
    const LOOKUP_META = refs.lookupMeta;
    LOOKUP_META.textContent = LOOKUP_NOTE;
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
export function showSubmitError(refs: BookFormRefs, error: unknown): void {
    const FORM_REFS = refs;
    FORM_REFS.lookupMeta.textContent = saveErrorMessage(error);
    if (focusFirstError(FORM_REFS.form)) {
        return;
    }
    focusCustomValidationTarget(FORM_REFS);
}
/**
 * Builds the current book dialog payload from live form controls.
 * @param refs - Resolved DOM references for the book dialog.
 * @returns Parsed payload ready for save handling.
 */
export function createBookSubmitPayload(refs: BookFormRefs): BookSubmitPayload {
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

export function setBookDialogIdleLabel(
    refs: BookFormRefs,
    label: string,
): void {
    refs.saveBtn.dataset.idleLabel = label;
    setBookDialogSavingState(refs, false);
}

export async function submitBookDialogPayload(args: {
    refs: BookFormRefs;
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
    payload: BookDialogSubmitPayload;
}): Promise<void> {
    setBookDialogSavingState(args.refs, true);
    try {
        await args.onSubmit(args.payload);
    } catch (error: unknown) {
        showSubmitError(args.refs, error);
        throw error;
    } finally {
        setBookDialogSavingState(args.refs, false);
    }
}

function handleBookDialogSubmit(
    args: BindBookDialogSubmitArgs,
    event: SubmitEvent,
): void {
    event.preventDefault();
    restoreLookupMetaText(args.refs);
    runBookDialogSubmitFlow({
        createPayload() {
            if (args.createPayload !== undefined) {
                return args.createPayload();
            }
            return createBookSubmitPayload(args.refs);
        },
        onComplete: args.onComplete,
        onError(error: unknown) {
            showSubmitError(args.refs, error);
        },
        onSubmit: args.onSubmit,
        setSavingState(busy: boolean) {
            setBookDialogSavingState(args.refs, busy);
        },
    });
}

/**
 * Binds the book form submit event to payload parsing and save orchestration.
 * @param args - Submit binding dependencies for the book dialog.
 */
export function bindBookDialogSubmit(args: BindBookDialogSubmitArgs): void {
    args.form.addEventListener("submit", (event) => {
        handleBookDialogSubmit(args, event);
    });
}

import type { SubmitProgressUpdateArgs } from "../../types/types.js";
import { parseOptionalNumber } from "./utils.js";

/**
 * Prefills input value from book progress value when present.
 * @param inputNode - Input element to set.
 * @param value - Optional source value.
 */
export function setInputValueFromBookProgress(
    inputNode: HTMLInputElement,
    value?: string | number,
): void {
    const TARGET_INPUT = inputNode;
    if (value !== undefined) {
        TARGET_INPUT.value = String(value);
    }
}

/**
 * Parses changed numeric value from input relative to initial text.
 * @param inputNode - Input element.
 * @param initialValue - Initial value text.
 * @returns Parsed number or `null` when unchanged/invalid.
 */
function changedNumberValue(
    inputNode: HTMLInputElement,
    initialValue: string,
): number | null {
    const CURRENT_VALUE = String(inputNode.value).trim();
    if (CURRENT_VALUE === String(initialValue)) {
        return null;
    }
    return parseOptionalNumber(CURRENT_VALUE);
}

/**
 * Syncs input element to provided numeric value when present.
 * @param inputNode - Input element.
 * @param nextValue - Optional value to write.
 * @returns Current trimmed input value after sync.
 */
function syncInputValue(
    inputNode: HTMLInputElement,
    nextValue?: number | null,
): string {
    const TARGET_INPUT = inputNode;
    if (nextValue === null || nextValue === undefined) {
        return String(TARGET_INPUT.value).trim();
    }
    TARGET_INPUT.value = String(nextValue);
    return String(TARGET_INPUT.value).trim();
}

/**
 * Submits progress update and returns updated baseline form values.
 * @param args - Form submission payload for the progress editor.
 * @param event - Form submit event.
 * @param row - Calendar row being edited.
 * @param pagesInput - Pages-read input element.
 * @param pctInput - Progress-percent input element.
 * @param initialPagesValue - Previous stable pages value.
 * @param initialPercentValue - Previous stable percent value.
 * @param interactionHandlers - Detail interaction handlers.
 * @returns Updated initial values and apply status.
 */
export function submitProgressUpdate(args: SubmitProgressUpdateArgs): {
    initialPagesValue: string;
    initialPercentValue: string;
    applied: boolean;
} {
    const {
        event,
        row,
        pagesInput,
        pctInput,
        initialPagesValue,
        initialPercentValue,
        interactionHandlers,
    } = args;
    event.preventDefault();
    const PAGES_READ = changedNumberValue(pagesInput, initialPagesValue);
    const PROGRESS_PERCENT = changedNumberValue(pctInput, initialPercentValue);
    if (PAGES_READ === null && PROGRESS_PERCENT === null) {
        return { applied: true, initialPagesValue, initialPercentValue };
    }

    const UPDATED = interactionHandlers.onSessionProgressUpdated({
        bookId: row.book_id,
        pagesRead: PAGES_READ,
        progressPercent: PROGRESS_PERCENT,
        row,
    });
    if (!UPDATED) {
        return { applied: false, initialPagesValue, initialPercentValue };
    }

    return {
        applied: true,
        initialPagesValue: syncInputValue(pagesInput, UPDATED.pages_read),
        initialPercentValue: syncInputValue(pctInput, UPDATED.progress_percent),
    };
}

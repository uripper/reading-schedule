import type { BookFormRefs, BookStatus } from "@reading-schedule/contracts";
import { syncDateInputDisabled } from "../date_control.ts";
import { COVER_PLACEHOLDER, WORDS_PER_PAGE } from "./constants.ts";
import { resolveCoverSource } from "./cover-source.ts";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.ts";
import {
    BOOK_STATUS_DROPPED,
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "./status_catalog.ts";
import { clamp, toOptionalInt } from "./utils.ts";

export const DEFAULT_PROGRESS = "0";
export const DEFAULT_PRIORITY = "3";
export const DEFAULT_DIFFICULTY = "3";
export const DEFAULT_MIN_BLOCKS = "1";
export const DEFAULT_STATUS = BOOK_STATUS_TO_READ;

export const CUSTOM_COVER_NOTE = "Custom cover uploaded.";

const PROGRESS_MAX = 100;
const PROGRESS_DECIMAL_SCALE = 10;

/**
 * Updates the book cover preview image and empty-state class.
 * @param refs - Form DOM references for the book dialog.
 * @param src - URL/path to show in the preview.
 */
export function setCoverPreview(refs: BookFormRefs, src: string): void {
    const PREVIEW = refs.coverPreview;
    const RESOLVED_SRC = resolveCoverSource(src);
    const HAS_SRC = RESOLVED_SRC !== "";
    if (HAS_SRC) {
        PREVIEW.src = RESOLVED_SRC;
    } else {
        PREVIEW.src = COVER_PLACEHOLDER;
    }
    PREVIEW.classList.toggle("is-empty", !HAS_SRC);
}

/**
 * Writes optional integer values into text inputs without `"null"` artifacts.
 * @param inputNode - Input node to update.
 * @param value - Number to render, or empty when missing.
 */
export function setOptionalIntegerInputValue(
    inputNode: HTMLInputElement,
    value: number | null | undefined,
): void {
    const TARGET_INPUT = inputNode;
    TARGET_INPUT.value = "";
    if (value === null || value === undefined) {
        return;
    }
    TARGET_INPUT.value = String(value);
}

/**
 * Clears optional date inputs using both string and date-value channels.
 * @param inputNode - Date input node to clear.
 */
export function clearOptionalDateInputValue(inputNode: HTMLInputElement): void {
    const TARGET_INPUT = inputNode;
    TARGET_INPUT.defaultValue = "";
    TARGET_INPUT.value = "";
    if (TARGET_INPUT.type === "date" && "valueAsDate" in TARGET_INPUT) {
        TARGET_INPUT.valueAsDate = null;
    }
}

/**
 * Writes optional date text into a date input without stale browser state.
 * @param inputNode - Date input node to update.
 * @param value - ISO date string when present.
 */
export function setOptionalDateInputValue(
    inputNode: HTMLInputElement,
    value: string | null | undefined,
): void {
    clearOptionalDateInputValue(inputNode);
    const TARGET_INPUT = inputNode;
    const NORMALIZED_VALUE = fallbackText(value).trim();
    if (NORMALIZED_VALUE === "") {
        return;
    }
    TARGET_INPUT.value = NORMALIZED_VALUE;
}

/**
 * Returns fallback text when a value is empty, null, or undefined.
 * @param value - Candidate text value.
 * @param fallback - Value used when `value` is missing.
 * @returns `value` when present; otherwise `fallback`.
 */
export function fallbackText(
    value: string | null | undefined,
    fallback = "",
): string {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }
    return value;
}

/**
 * Returns number text or fallback when numeric value is absent/zero.
 * @param value - Candidate numeric value.
 * @param fallback - Value used when `value` is missing.
 * @returns String form of `value` or the provided fallback.
 */
export function fallbackNumberText(
    value: number | null | undefined,
    fallback: string,
): string {
    if (value === null || value === undefined || value === 0) {
        return fallback;
    }
    return String(value);
}

/**
 * Reads and validates required title input.
 * @param refs - Form DOM references for the book dialog.
 * @returns Trimmed title text.
 * @throws {Error} Thrown when the title is blank.
 */
export function requiredTitle(refs: BookFormRefs): string {
    const TITLE = refs.titleInput.value.trim();
    if (!TITLE) {
        throw new Error("Title is required.");
    }
    return TITLE;
}

/**
 * Reads and normalizes selected status into a supported book status.
 * @param refs - Form DOM references for the book dialog.
 * @returns Supported book status value.
 */
export function validatedStatusSelection(refs: BookFormRefs): BookStatus {
    const RAW = String(refs.statusSelectInput.value).trim();
    if (RAW === BOOK_STATUS_READ) {
        return BOOK_STATUS_READ;
    }
    if (RAW === BOOK_STATUS_IN_PROGRESS) {
        return BOOK_STATUS_IN_PROGRESS;
    }
    if (RAW === BOOK_STATUS_DROPPED) {
        return BOOK_STATUS_DROPPED;
    }
    return BOOK_STATUS_TO_READ;
}

/**
 * Shows or hides finished-date controls based on selected status.
 * @param refs - Form DOM references for the book dialog.
 * @param status - Current normalized status value.
 */
function toggleFinishedAtInput(refs: BookFormRefs, status: BookStatus): void {
    const { finishedAtField, finishedAtInput } = refs;
    const IS_READ = status === BOOK_STATUS_READ;
    finishedAtField.hidden = !IS_READ;
    syncDateInputDisabled(finishedAtInput, !IS_READ);
}

/**
 * Synchronizes finished-date field visibility with current status selection.
 * @param refs - Form DOM references for the book dialog.
 */
export function syncFinishedAtFieldState(refs: BookFormRefs): void {
    const STATUS = validatedStatusSelection(refs);
    toggleFinishedAtInput(refs, STATUS);
}

function lengthInputs(refs: BookFormRefs): {
    pagesRead: number | null;
    pagesTotal: number | null;
    progress: number;
    wordsTotal: number | null;
} {
    return {
        pagesRead: toOptionalInt(refs.pagesReadInput.value),
        pagesTotal: toOptionalInt(refs.pagesTotalInput.value),
        progress: clamp(Number(refs.progressInput.value), 0, PROGRESS_MAX),
        wordsTotal: toOptionalInt(refs.wordsInput.value),
    };
}

function hasPositiveLength(value: number | null): boolean {
    return value !== null && value > 0;
}

function assertHasLengthInput(
    wordsTotal: number | null,
    pagesTotal: number | null,
): void {
    if (hasPositiveLength(wordsTotal) || hasPositiveLength(pagesTotal)) {
        return;
    }
    throw new Error("Enter estimated words or total pages.");
}

function normalizedPageProgress(
    pagesTotal: number,
    pagesRead: number | null,
    progress: number,
): { pagesRead: number; progress: number } {
    let nextPagesRead = pagesRead;
    nextPagesRead ??= Math.round((progress / PROGRESS_MAX) * pagesTotal);
    const CLAMPED_PAGES_READ = clamp(nextPagesRead, 0, pagesTotal);
    const NORMALIZED_PROGRESS =
        Math.round(
            (CLAMPED_PAGES_READ / pagesTotal) *
                PROGRESS_MAX *
                PROGRESS_DECIMAL_SCALE,
        ) / PROGRESS_DECIMAL_SCALE;
    return {
        pagesRead: CLAMPED_PAGES_READ,
        progress: NORMALIZED_PROGRESS,
    };
}

function estimatedWordsTotal(
    wordsTotal: number | null,
    pagesTotal: number,
): number {
    if (wordsTotal !== null && wordsTotal > 0) {
        return wordsTotal;
    }
    return pagesTotal * WORDS_PER_PAGE;
}

/**
 * Parses and validates length/progress inputs into normalized numeric values.
 * @param refs - Form DOM references for the book dialog.
 * @returns Parsed length and progress values for normalization.
 * @throws {Error} Thrown when neither words nor page total is provided.
 */
export function deriveLengthAndProgress(refs: BookFormRefs): {
    wordsTotal: number | null;
    pagesTotal: number | null;
    pagesRead: number | null;
    progress: number;
} {
    const INPUTS = lengthInputs(refs);
    assertHasLengthInput(INPUTS.wordsTotal, INPUTS.pagesTotal);

    const PAGES_TOTAL = INPUTS.pagesTotal;
    if (PAGES_TOTAL !== null && hasPositiveLength(PAGES_TOTAL)) {
        const NORMALIZED = normalizedPageProgress(
            PAGES_TOTAL,
            INPUTS.pagesRead,
            INPUTS.progress,
        );
        return {
            pagesRead: NORMALIZED.pagesRead,
            pagesTotal: PAGES_TOTAL,
            progress: NORMALIZED.progress,
            wordsTotal: estimatedWordsTotal(INPUTS.wordsTotal, PAGES_TOTAL),
        };
    }

    return {
        pagesRead: null,
        pagesTotal: PAGES_TOTAL,
        progress: INPUTS.progress,
        wordsTotal: INPUTS.wordsTotal,
    };
}

/**
 * Reads shelf selection and rejects the placeholder create-new option.
 * @param refs - Form DOM references for the book dialog.
 * @returns Selected shelf id.
 * @throws {Error} Thrown when no valid shelf is selected.
 */
export function validatedShelfSelection(refs: BookFormRefs): string {
    const SHELF = refs.shelfSelectInput.value;
    if (SHELF === SHELF_SELECT_CREATE_NEW) {
        throw new Error(
            "Choose a shelf or create a new one from the shelf selector.",
        );
    }
    return SHELF;
}

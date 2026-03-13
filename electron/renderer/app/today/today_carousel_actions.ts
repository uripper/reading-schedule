import type { PlannerScheduleRow } from "../../../types/types.ts";
import {
    normalizedPagesValue,
    normalizedPercentValue,
} from "./today_carousel_progress.ts";

const EMPTY_TEXT = "";
const MIN_MINUTES = 1;

interface ProgressUpdateDraft {
    pagesText: string;
    percentText: string;
}
interface ProgressUpdatePayload {
    bookId: string;
    pagesRead?: number | null;
    progressPercent?: number | null;
    row: PlannerScheduleRow;
}

interface ProgressPayloadResult {
    error: string;
    payload: ProgressUpdatePayload;
    valid: boolean;
}

function parseOptionalNumber(valueRaw: string): number | null {
    const VALUE_TEXT = String(valueRaw || "").trim();
    if (VALUE_TEXT === EMPTY_TEXT) {
        return null;
    }
    const PARSED = Number(VALUE_TEXT);
    if (!Number.isFinite(PARSED)) {
        return null;
    }
    return PARSED;
}

function changedValue(
    currentValue: number | null,
    nextValue: number | null,
): boolean {
    if (currentValue === null && nextValue === null) {
        return false;
    }
    return currentValue !== nextValue;
}

function isLogSessionComplete(activeCompleted: boolean): boolean {
    return Boolean(activeCompleted);
}

export function logSessionButtonText(activeCompleted: boolean): string {
    if (isLogSessionComplete(activeCompleted)) {
        return "Completed";
    }
    return "Log Session";
}

export function shouldDisableProgressInputs(activeCompleted: boolean): boolean {
    return isLogSessionComplete(activeCompleted);
}

/**
 * Build a progress update payload from the provided options, validating and normalizing pages and percent inputs.
 * @example
 * buildProgressUpdatePayload({
 *   bookId: 'book-123',
 *   currentPagesRead: 50,
 *   currentPercent: 16.7,
 *   currentPagesTotal: 300,
 *   draft: { pagesText: '50', percentText: '16.7' },
 *   row: somePlannerRow
 * })
 * { error: '', payload: { bookId: 'book-123', row: somePlannerRow, pagesRead: 50, progressPercent: 16.7 }, valid: true }
 * @param options - Options object containing identifiers, current values, totals and the raw draft inputs.
 * @returns Returns an object with an error message (empty if none), a payload containing bookId/row and any changed fields (pagesRead, progressPercent), and a valid boolean.
 **/
export function buildProgressUpdatePayload(options: {
    bookId: string;
    currentPagesRead: number | null;
    currentPercent: number;
    currentPagesTotal: number | null;
    draft: ProgressUpdateDraft;
    row: PlannerScheduleRow;
}): ProgressPayloadResult {
    const PAGES = normalizedPagesValue({
        currentPagesRead: options.currentPagesRead,
        pagesText: options.draft.pagesText,
        pagesTotal: options.currentPagesTotal,
    });
    if (PAGES.error) {
        return {
            error: PAGES.error,
            payload: {
                bookId: options.bookId,
                row: options.row,
            },
            valid: false,
        };
    }
    const PERCENT = normalizedPercentValue({
        currentPercent: options.currentPercent,
        percentText: options.draft.percentText,
    });
    if (PERCENT.error) {
        return {
            error: PERCENT.error,
            payload: {
                bookId: options.bookId,
                row: options.row,
            },
            valid: false,
        };
    }

    const PAYLOAD: ProgressUpdatePayload = {
        bookId: options.bookId,
        row: options.row,
    };
    const CURRENT_PERCENT =
        Math.round(Number(options.currentPercent || 0) * 10) / 10;

    if (changedValue(options.currentPagesRead, PAGES.value)) {
        PAYLOAD.pagesRead = PAGES.value;
    }
    if (changedValue(CURRENT_PERCENT, PERCENT.value)) {
        PAYLOAD.progressPercent = PERCENT.value;
    }

    return {
        error: EMPTY_TEXT,
        payload: PAYLOAD,
        valid: true,
    };
}

/**
 * Parse a text input for planned minutes, validate it, and return either an error message or the rounded minutes.
 * @example
 * parseMinutesInput("15")
 * { error: "", minutes: 15 }
 * @param minutesText - Input text representing the planned minutes.
 * @returns Return object containing an error message (empty if valid) and the parsed minutes or null on error.
 **/
export function parseMinutesInput(minutesText: string): {
    error: string;
    minutes: number | null;
} {
    const PARSED = parseOptionalNumber(minutesText);
    if (PARSED === null) {
        return {
            error: "Planned Minutes must be a number.",
            minutes: null,
        };
    }
    const MINUTES = Math.round(PARSED);
    if (MINUTES < MIN_MINUTES) {
        return {
            error: "Planned Minutes must be at least 1.",
            minutes: null,
        };
    }
    return {
        error: EMPTY_TEXT,
        minutes: MINUTES,
    };
}

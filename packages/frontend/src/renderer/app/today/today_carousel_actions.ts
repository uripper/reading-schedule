import type { CalendarRowWithFinish } from "../../../types/types.ts";
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
    row: CalendarRowWithFinish;
}

interface ProgressPayloadResult {
    error: string;
    payload: ProgressUpdatePayload;
    valid: boolean;
}

interface ProgressUpdatePayloadOptions {
    bookId: string;
    currentPagesRead: number | null;
    currentPagesTotal: number | null;
    currentPercent: number;
    draft: ProgressUpdateDraft;
    row: CalendarRowWithFinish;
}

interface ProgressPayloadChangeOptions {
    currentPagesRead: number | null;
    currentPercent: number;
    pagesRead: number | null;
    progressPercent: number | null;
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

export function logSessionButtonText(activeCompleted: boolean): string {
    if (activeCompleted) {
        return "Reopen session";
    }
    return "Complete session";
}

function progressPayloadBase(
    bookId: string,
    row: CalendarRowWithFinish,
): ProgressUpdatePayload {
    return { bookId, row };
}

function invalidProgressPayload(
    error: string,
    bookId: string,
    row: CalendarRowWithFinish,
): ProgressPayloadResult {
    return {
        error,
        payload: progressPayloadBase(bookId, row),
        valid: false,
    };
}

function roundedCurrentPercent(currentPercent: number): number {
    return Math.round(Number(currentPercent || 0) * 10) / 10;
}

interface NormalizedProgressValues {
    error: string;
    pagesRead: number | null;
    progressPercent: number | null;
    valid: boolean;
}

function invalidNormalizedProgressValues(
    error: string,
    pagesRead: number | null,
): NormalizedProgressValues {
    return { error, pagesRead, progressPercent: null, valid: false };
}

function validNormalizedProgressValues(
    pagesRead: number | null,
    progressPercent: number | null,
): NormalizedProgressValues {
    return { error: EMPTY_TEXT, pagesRead, progressPercent, valid: true };
}

function validProgressPayload(
    bookId: string,
    row: CalendarRowWithFinish,
    changes: Partial<ProgressUpdatePayload>,
): ProgressPayloadResult {
    return {
        error: EMPTY_TEXT,
        payload: { ...progressPayloadBase(bookId, row), ...changes },
        valid: true,
    };
}

function normalizedProgressValues(options: {
    currentPagesRead: number | null;
    currentPagesTotal: number | null;
    currentPercent: number;
    draft: ProgressUpdateDraft;
}): NormalizedProgressValues {
    const PAGES = normalizedPagesValue({
        currentPagesRead: options.currentPagesRead,
        pagesText: options.draft.pagesText,
        pagesTotal: options.currentPagesTotal,
    });
    if (PAGES.error) {
        return invalidNormalizedProgressValues(PAGES.error, null);
    }
    const PERCENT = normalizedPercentValue({
        currentPercent: options.currentPercent,
        percentText: options.draft.percentText,
    });
    if (PERCENT.error) {
        return invalidNormalizedProgressValues(PERCENT.error, PAGES.value);
    }
    return validNormalizedProgressValues(PAGES.value, PERCENT.value);
}

function progressPayloadChanges(
    options: ProgressPayloadChangeOptions,
): Partial<ProgressUpdatePayload> {
    const CHANGES: Partial<ProgressUpdatePayload> = {};
    if (changedValue(options.currentPagesRead, options.pagesRead)) {
        CHANGES.pagesRead = options.pagesRead;
    }
    if (
        changedValue(
            roundedCurrentPercent(options.currentPercent),
            options.progressPercent,
        )
    ) {
        CHANGES.progressPercent = options.progressPercent;
    }
    return CHANGES;
}

function validProgressUpdatePayload(
    options: ProgressUpdatePayloadOptions,
    values: NormalizedProgressValues,
): ProgressPayloadResult {
    return validProgressPayload(
        options.bookId,
        options.row,
        progressPayloadChanges({
            currentPagesRead: options.currentPagesRead,
            currentPercent: options.currentPercent,
            pagesRead: values.pagesRead,
            progressPercent: values.progressPercent,
        }),
    );
}

export function buildProgressUpdatePayload(
    options: ProgressUpdatePayloadOptions,
): ProgressPayloadResult {
    const VALUES = normalizedProgressValues(options);
    if (!VALUES.valid) {
        return invalidProgressPayload(
            VALUES.error,
            options.bookId,
            options.row,
        );
    }
    return validProgressUpdatePayload(options, VALUES);
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

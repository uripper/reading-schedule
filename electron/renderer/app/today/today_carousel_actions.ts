import type { PlannerScheduleRow } from "../../../types/types.js";
import {
    normalizedPagesValue,
    normalizedPercentValue,
} from "./today_carousel_progress.js";

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

const EMPTY_TEXT = "";
const MAX_PERCENT = 100;
const MIN_PROGRESS = 0;
const PERCENT_PRECISION_FACTOR = 10;
const UNKNOWN_PAGES_TOTAL = "--";
const EMPTY_PROGRESS_DRAFT: TodayProgressDraft = {
    pagesText: EMPTY_TEXT,
    percentText: EMPTY_TEXT,
};

export interface TodayProgressDraft {
    pagesText: string;
    percentText: string;
}

export interface TodayProgressInputViewModel {
    pagesMax: string;
    pagesPlaceholder: string;
    pagesText: string;
    percentPlaceholder: string;
    percentText: string;
}

type NormalizedPagesValueOptions = {
    currentPagesRead: number | null;
    pagesText: string;
    pagesTotal: number | null;
};

function isBlankText(value: string): boolean {
    return value.trim() === EMPTY_TEXT;
}

function parseOptionalNumber(valueRaw: string): number | null {
    const VALUE_TEXT = valueRaw.trim();
    if (VALUE_TEXT === EMPTY_TEXT) {
        return null;
    }
    const PARSED = Number(VALUE_TEXT);
    if (!Number.isFinite(PARSED)) {
        return null;
    }
    return PARSED;
}

function roundedPages(value: number): number {
    return Math.round(value);
}

function roundedPercent(value: number): number {
    return (
        Math.round(value * PERCENT_PRECISION_FACTOR) / PERCENT_PRECISION_FACTOR
    );
}

function formattedPagesValue(pagesRead: number | null): string {
    if (pagesRead === null) {
        return EMPTY_TEXT;
    }
    return String(roundedPages(pagesRead));
}

function formattedPercentValue(percent: number): string {
    return String(roundedPercent(percent));
}

/**
 * Trim input text and return a bounded numeric string if the trimmed value is a parsable number, enforcing a minimum and an optional maximum.
 * @example
 * boundedText(" 5 ", 10)
 * "5"
 * @param {{string}} {{valueRaw}} - Raw text input which may contain whitespace or a numeric value.
 * @param {{number|null}} {{maximum}} - Optional upper bound; if null no upper bound is applied.
 * @returns {{string}} Return the trimmed original text, the clamped numeric value as a string, or the empty text.
 **/
function boundedText(valueRaw: string, maximum: number | null): string {
    const VALUE_TEXT = valueRaw.trim();
    if (VALUE_TEXT === EMPTY_TEXT) {
        return EMPTY_TEXT;
    }
    const PARSED = parseOptionalNumber(VALUE_TEXT);
    if (PARSED === null) {
        return VALUE_TEXT;
    }
    if (PARSED < MIN_PROGRESS) {
        return String(MIN_PROGRESS);
    }
    return boundedMaximumText(PARSED, VALUE_TEXT, maximum);
}

function boundedMaximumText(
    parsed: number,
    valueText: string,
    maximum: number | null,
): string {
    if (maximum !== null && parsed > maximum) {
        return String(maximum);
    }
    return valueText;
}

function boundedPagesText(
    pagesText: string,
    pagesTotal: number | null,
): string {
    if (pagesTotal === null) {
        return boundedText(pagesText, null);
    }
    return boundedText(pagesText, roundedPages(pagesTotal));
}

function boundedPercentText(percentText: string): string {
    return boundedText(percentText, MAX_PERCENT);
}

function boundedDraftOrEmpty(
    draft: TodayProgressDraft | null,
    pagesTotal: number | null,
): TodayProgressDraft {
    if (draft === null) {
        return EMPTY_PROGRESS_DRAFT;
    }
    return boundedTodayProgressDraft({ draft, pagesTotal });
}

/**
 * Return a TodayProgressDraft with pagesText and percentText bounded according to available total pages.
 * @example
 * boundedTodayProgressDraft({ draft: sampleDraft, pagesTotal: 10 })
 * { pagesText: '1/10', percentText: '10%' }
 * @param {{draft: TodayProgressDraft, pagesTotal: number | null}} {{options}} - Options containing the draft to bound and an optional total pages value.
 * @returns {{TodayProgressDraft}} Bounded TodayProgressDraft with normalized pagesText and percentText.
 **/
export function boundedTodayProgressDraft(options: {
    draft: TodayProgressDraft;
    pagesTotal: number | null;
}): TodayProgressDraft {
    return {
        pagesText: boundedPagesText(
            options.draft.pagesText,
            options.pagesTotal,
        ),
        percentText: boundedPercentText(options.draft.percentText),
    };
}

function derivedPagesPlaceholder(options: {
    currentPagesRead: number | null;
    pagesTotal: number | null;
    percentText: string;
}): string {
    const PERCENT = parseOptionalNumber(options.percentText);
    if (PERCENT === null || options.pagesTotal === null) {
        return formattedPagesValue(options.currentPagesRead);
    }
    return String(roundedPages((PERCENT / MAX_PERCENT) * options.pagesTotal));
}

/**
 * Compute display percent string either from currentPercent or derived from pagesText/pagesTotal.
 * @example
 * derivedPercentPlaceholder({ currentPercent: 50, pagesText: '3', pagesTotal: 10 })
 * 30%
 * @param {{Object}} {{options}} - Options containing currentPercent (number), pagesText (string), and pagesTotal (number|null).
 * @returns {{string}} Formatted percent string for display.
 **/
function derivedPercentPlaceholder(options: {
    currentPercent: number;
    pagesText: string;
    pagesTotal: number | null;
}): string {
    const PAGES = parseOptionalNumber(options.pagesText);
    if (
        PAGES === null ||
        options.pagesTotal === null ||
        options.pagesTotal < 1
    ) {
        return formattedPercentValue(options.currentPercent);
    }
    return formattedPercentValue((PAGES / options.pagesTotal) * MAX_PERCENT);
}

function pagesMaxText(pagesTotal: number | null): string {
    if (pagesTotal === null) {
        return EMPTY_TEXT;
    }
    return String(roundedPages(pagesTotal));
}

/**
 * Build a view model for today's progress input fields from the current state and an optional draft.
 * @example
 * buildTodayProgressInputViewModel({
 *   currentPagesRead: 10,
 *   currentPercent: 25,
 *   draft: null,
 *   pagesTotal: 300,
 * })
 * { pagesMax: "300", pagesPlaceholder: "...", pagesText: "", percentPlaceholder: "...", percentText: "" }
 * @param {{Object}} {{options}} - Options used to construct the input view model.
 * @param {{number|null}} {{options.currentPagesRead}} - Current number of pages read or null if unknown.
 * @param {{number}} {{options.currentPercent}} - Current percent complete (0-100).
 * @param {{TodayProgressDraft|null}} {{options.draft}} - Optional draft containing user-entered pages/percent text.
 * @param {{number|null}} {{options.pagesTotal}} - Total number of pages or null if unknown.
 * @returns {{TodayProgressInputViewModel}} Return object with pagesMax, pagesPlaceholder, pagesText, percentPlaceholder, and percentText.
 **/
export function buildTodayProgressInputViewModel(options: {
    currentPagesRead: number | null;
    currentPercent: number;
    draft: TodayProgressDraft | null;
    pagesTotal: number | null;
}): TodayProgressInputViewModel {
    const DRAFT = boundedDraftOrEmpty(options.draft, options.pagesTotal);
    return {
        pagesMax: pagesMaxText(options.pagesTotal),
        pagesPlaceholder: derivedPagesPlaceholder({
            currentPagesRead: options.currentPagesRead,
            pagesTotal: options.pagesTotal,
            percentText: DRAFT.percentText,
        }),
        pagesText: DRAFT.pagesText,
        percentPlaceholder: derivedPercentPlaceholder({
            currentPercent: options.currentPercent,
            pagesText: DRAFT.pagesText,
            pagesTotal: options.pagesTotal,
        }),
        percentText: DRAFT.percentText,
    };
}

export function formatPagesTotalText(pagesTotal: number | null): string {
    if (pagesTotal === null) {
        return UNKNOWN_PAGES_TOTAL;
    }
    return String(roundedPages(pagesTotal));
}

/**
 * Normalize a pages-text input into a validated page count or an error.
 * @example
 * normalizedPagesValue({ currentPagesRead: 10, pagesText: "42", pagesTotal: 100 })
 * { error: "", value: 42 }
 * @param {{ {currentPagesRead: number | null; pagesText: string; pagesTotal: number | null} }} {{options}} - Options object containing currentPagesRead, the raw pagesText input, and optional pagesTotal.
 * @returns {{ {error: string; value: number | null} }} Return object with an error message (EMPTY_TEXT when no error) and the normalized page number or null.
 **/
export function normalizedPagesValue(options: NormalizedPagesValueOptions): {
    error: string;
    value: number | null;
} {
    if (isBlankText(options.pagesText)) {
        return currentPagesValue(options.currentPagesRead);
    }
    const PARSED = parseOptionalNumber(options.pagesText);
    if (PARSED === null) {
        return invalidPagesValue("Pages Read must be a number.");
    }
    return validatedPagesValue(roundedPages(PARSED), options.pagesTotal);
}

function currentPagesValue(currentPagesRead: number | null): {
    error: string;
    value: number | null;
} {
    return {
        error: EMPTY_TEXT,
        value: currentPagesRead,
    };
}

function invalidPagesValue(error: string): {
    error: string;
    value: null;
} {
    return { error, value: null };
}

function pagesValueError(pages: number, pagesTotal: number | null): string {
    if (pages < MIN_PROGRESS) {
        return "Pages Read cannot be negative.";
    }
    if (pagesTotal !== null && pages > roundedPages(pagesTotal)) {
        return "Pages Read cannot exceed total pages.";
    }
    return EMPTY_TEXT;
}

function validatedPagesValue(
    pages: number,
    pagesTotal: number | null,
): {
    error: string;
    value: number | null;
} {
    const ERROR = pagesValueError(pages, pagesTotal);
    if (ERROR !== EMPTY_TEXT) {
        return invalidPagesValue(ERROR);
    }
    return { error: EMPTY_TEXT, value: pages };
}

/**
 * Normalize and validate a percentage input from text, returning an error message (if any) and a numeric percent value.
 * @example
 * normalizedPercentValue({ currentPercent: 10, percentText: "75" })
 * { error: "", value: 75 }
 * @param {{Object}} {{options}} - Contains currentPercent (number fallback) and percentText (user-entered string to parse).
 * @returns {{Object}} Return object with error (string) and value (number).
 **/
export function normalizedPercentValue(options: {
    currentPercent: number;
    percentText: string;
}): {
    error: string;
    value: number;
} {
    if (isBlankText(options.percentText)) {
        return {
            error: EMPTY_TEXT,
            value: roundedPercent(options.currentPercent),
        };
    }
    const PARSED = parseOptionalNumber(options.percentText);
    if (PARSED === null) {
        return { error: "Complete % must be a number.", value: MIN_PROGRESS };
    }
    if (PARSED < MIN_PROGRESS || PARSED > MAX_PERCENT) {
        return {
            error: "Complete % must be between 0 and 100.",
            value: MIN_PROGRESS,
        };
    }
    return { error: EMPTY_TEXT, value: roundedPercent(PARSED) };
}

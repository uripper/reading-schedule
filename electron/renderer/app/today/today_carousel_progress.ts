const EMPTY_TEXT = "";
const MAX_PERCENT = 100;
const MIN_PROGRESS = 0;
const PERCENT_PRECISION_FACTOR = 10;
const UNKNOWN_PAGES_TOTAL = "--";

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
    if (maximum !== null && PARSED > maximum) {
        return String(maximum);
    }
    return VALUE_TEXT;
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

export function buildTodayProgressInputViewModel(options: {
    currentPagesRead: number | null;
    currentPercent: number;
    draft: TodayProgressDraft | null;
    pagesTotal: number | null;
}): TodayProgressInputViewModel {
    let draft: TodayProgressDraft | null = null;
    if (options.draft !== null) {
        draft = boundedTodayProgressDraft({
            draft: options.draft,
            pagesTotal: options.pagesTotal,
        });
    }
    const PAGES_TEXT = draft?.pagesText ?? EMPTY_TEXT;
    const PERCENT_TEXT = draft?.percentText ?? EMPTY_TEXT;
    let pagesMax = EMPTY_TEXT;
    if (options.pagesTotal !== null) {
        pagesMax = String(roundedPages(options.pagesTotal));
    }
    return {
        pagesMax,
        pagesPlaceholder: derivedPagesPlaceholder({
            currentPagesRead: options.currentPagesRead,
            pagesTotal: options.pagesTotal,
            percentText: PERCENT_TEXT,
        }),
        pagesText: PAGES_TEXT,
        percentPlaceholder: derivedPercentPlaceholder({
            currentPercent: options.currentPercent,
            pagesText: PAGES_TEXT,
            pagesTotal: options.pagesTotal,
        }),
        percentText: PERCENT_TEXT,
    };
}

export function formatPagesTotalText(pagesTotal: number | null): string {
    if (pagesTotal === null) {
        return UNKNOWN_PAGES_TOTAL;
    }
    return String(roundedPages(pagesTotal));
}

export function normalizedPagesValue(options: {
    currentPagesRead: number | null;
    pagesText: string;
    pagesTotal: number | null;
}): {
    error: string;
    value: number | null;
} {
    if (isBlankText(options.pagesText)) {
        return {
            error: EMPTY_TEXT,
            value: options.currentPagesRead,
        };
    }
    const PARSED = parseOptionalNumber(options.pagesText);
    if (PARSED === null) {
        return { error: "Pages Read must be a number.", value: null };
    }
    const PAGES = roundedPages(PARSED);
    if (PAGES < MIN_PROGRESS) {
        return { error: "Pages Read cannot be negative.", value: null };
    }
    if (
        options.pagesTotal !== null &&
        PAGES > roundedPages(options.pagesTotal)
    ) {
        return {
            error: "Pages Read cannot exceed total pages.",
            value: null,
        };
    }
    return { error: EMPTY_TEXT, value: PAGES };
}

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

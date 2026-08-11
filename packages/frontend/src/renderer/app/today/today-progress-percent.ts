/**
 * Validates and finalizes decimal percentage drafts for Today progress.
 */

const DECIMAL_POINT = ".";
const DECIMAL_COMMA = ",";
const EMPTY_TEXT = "";
const MIN_PROGRESS_PERCENT = 0;
const PERCENT_PRECISION_FACTOR = 10;
const VALID_DECIMAL_PATTERN = /^\d*(?:\.\d*)?$/u;
export const MAX_PROGRESS_PERCENT = 100;

/** Canonicalizes the supported locale decimal separator. */
function canonicalPercentText(valueRaw: string): string {
    return valueRaw.trim().replaceAll(DECIMAL_COMMA, DECIMAL_POINT);
}

/**
 * Rounds a percentage to the single decimal place supported by Today.
 * @param value - Percentage to round.
 * @returns Percentage rounded to at most one decimal place.
 */
export function roundedPercent(value: number): number {
    return (
        Math.round(value * PERCENT_PRECISION_FACTOR) / PERCENT_PRECISION_FACTOR
    );
}

/** Removes every character that is not an ASCII digit. */
function digitsOnly(valueText: string): string {
    return valueText.replace(/\D/gu, EMPTY_TEXT);
}

/** Keeps digits and the first decimal separator from a live draft. */
function digitsAndFirstSeparator(valueText: string): string {
    const CANONICAL = canonicalPercentText(valueText);
    const SEPARATOR_INDEX = CANONICAL.indexOf(DECIMAL_POINT);
    if (SEPARATOR_INDEX < 0) {
        return digitsOnly(CANONICAL);
    }
    const WHOLE_DIGITS = digitsOnly(CANONICAL.slice(0, SEPARATOR_INDEX));
    const DECIMAL_DIGITS = digitsOnly(CANONICAL.slice(SEPARATOR_INDEX + 1));
    return `${WHOLE_DIGITS}${DECIMAL_POINT}${DECIMAL_DIGITS}`;
}

/** Clamps a parseable live draft to the inclusive upper bound. */
function clampDraftMaximum(valueText: string): string {
    if (valueText === EMPTY_TEXT || valueText === DECIMAL_POINT) {
        return valueText;
    }
    const PARSED = Number(valueText);
    if (PARSED > MAX_PROGRESS_PERCENT) {
        return String(MAX_PROGRESS_PERCENT);
    }
    return valueText;
}

/**
 * Sanitizes a live draft while preserving a trailing decimal separator.
 * @param valueRaw - Current input text.
 * @returns Canonical decimal text clamped to the percentage bounds.
 */
export function boundedPercentDraftText(valueRaw: string): string {
    const VALUE_TEXT = valueRaw.trim();
    if (VALUE_TEXT.startsWith("-")) {
        return String(MIN_PROGRESS_PERCENT);
    }
    return clampDraftMaximum(digitsAndFirstSeparator(VALUE_TEXT));
}

/**
 * Finalizes a live percentage draft for display when editing ends.
 * @param valueRaw - Current input text.
 * @returns Empty text or a percentage rounded to one decimal place.
 */
export function finalizedPercentDraftText(valueRaw: string): string {
    const BOUNDED = boundedPercentDraftText(valueRaw);
    if (BOUNDED === EMPTY_TEXT || BOUNDED === DECIMAL_POINT) {
        return EMPTY_TEXT;
    }
    return String(roundedPercent(Number(BOUNDED)));
}

/** Returns the validation error for committed percentage text. */
function percentValueError(valueText: string, parsed: number): string {
    if (parsed < MIN_PROGRESS_PERCENT || parsed > MAX_PROGRESS_PERCENT) {
        return "Complete % must be between 0 and 100.";
    }
    if (!(VALID_DECIMAL_PATTERN.test(valueText) && Number.isFinite(parsed))) {
        return "Complete % must be a number.";
    }
    return EMPTY_TEXT;
}

/**
 * Normalizes committed percentage text and rejects malformed decimals.
 * @param options - Saved percentage fallback and user-entered text.
 * @returns A rounded percentage with an empty error, or a validation error.
 */
export function normalizedPercentValue(options: {
    currentPercent: number;
    percentText: string;
}): {
    error: string;
    value: number;
} {
    const VALUE_TEXT = canonicalPercentText(options.percentText);
    if (VALUE_TEXT === EMPTY_TEXT) {
        return {
            error: EMPTY_TEXT,
            value: roundedPercent(options.currentPercent),
        };
    }
    const PARSED = Number(VALUE_TEXT);
    const ERROR = percentValueError(VALUE_TEXT, PARSED);
    if (ERROR !== EMPTY_TEXT) {
        return { error: ERROR, value: MIN_PROGRESS_PERCENT };
    }
    return { error: EMPTY_TEXT, value: roundedPercent(PARSED) };
}

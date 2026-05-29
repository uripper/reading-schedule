/**
 * Shared primitive comparators used by book sorting.
 */
import type { OptionalNumber, OptionalString } from "../../types/types.ts";
import { titleSortKey } from "./title_key.ts";

/**
 * Converts missing-value flags into a sort result.
 * @param leftMissing - Whether the left value is missing.
 * @param rightMissing - Whether the right value is missing.
 * @returns Sort result when at least one side is missing, otherwise `null`.
 */
function missingValueResult(
    leftMissing: boolean,
    rightMissing: boolean,
): number | null {
    if (leftMissing && rightMissing) {
        return 0;
    }
    if (leftMissing) {
        return 1;
    }
    if (rightMissing) {
        return -1;
    }
    return null;
}

/**
 * Checks whether an optional numeric value should sort as missing.
 * @param value - Numeric candidate.
 * @returns `true` when the value is nullish.
 */
function isMissingNumber(value: OptionalNumber): boolean {
    return value === null || value === undefined;
}

/**
 * Checks whether an optional text value should sort as missing.
 * @param value - Text candidate.
 * @returns `true` when the value is blank or nullish.
 */
function isMissingString(value: OptionalString): boolean {
    return value === null || value === undefined || value.trim() === "";
}

/**
 * Compares optional numbers with missing values sorted last.
 * @param left - Left numeric value.
 * @param right - Right numeric value.
 * @returns Negative/zero/positive comparison result.
 */
export function compareNumbers(
    left: OptionalNumber,
    right: OptionalNumber,
): number {
    const MISSING_RESULT = missingValueResult(
        isMissingNumber(left),
        isMissingNumber(right),
    );
    if (MISSING_RESULT !== null) {
        return MISSING_RESULT;
    }
    const LEFT_NUMBER = Number(left);
    const RIGHT_NUMBER = Number(right);
    return LEFT_NUMBER - RIGHT_NUMBER;
}

/**
 * Returns lowercase comparison text with surrounding whitespace removed.
 * @param value - Text candidate.
 * @returns Normalized text for case-insensitive comparison.
 */
function normalizedCompareText(value: OptionalString): string {
    return (value ?? "").trim().toLowerCase();
}

/**
 * Compares optional text values case-insensitively with blanks sorted last.
 * @param left - Left text value.
 * @param right - Right text value.
 * @returns Negative/zero/positive comparison result.
 */
export function compareText(
    left: OptionalString,
    right: OptionalString,
): number {
    const MISSING_RESULT = missingValueResult(
        isMissingString(left),
        isMissingString(right),
    );
    if (MISSING_RESULT !== null) {
        return MISSING_RESULT;
    }
    return normalizedCompareText(left).localeCompare(
        normalizedCompareText(right),
        undefined,
        {
            sensitivity: "base",
        },
    );
}

/**
 * Compares titles using normalized sort keys, then raw text as tie-breaker.
 * @param left - Left title text.
 * @param right - Right title text.
 * @returns Negative/zero/positive comparison result.
 */
export function compareTitleText(
    left: OptionalString,
    right: OptionalString,
): number {
    const BY_KEY = compareText(titleSortKey(left), titleSortKey(right));
    if (BY_KEY !== 0) {
        return BY_KEY;
    }
    return compareText(left, right);
}

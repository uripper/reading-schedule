/**
 * Author-name comparison for canonical display names.
 */
import type { OptionalString } from "../../types/types.ts";
import { compareText } from "./sort-compare.ts";

const AUTHOR_SUFFIXES = new Set([
    "jr",
    "jr.",
    "sr",
    "sr.",
    "ii",
    "iii",
    "iv",
    "v",
]);

/**
 * Splits a canonical display author into whitespace-separated name parts.
 * @param author - Author text from the normalized book model.
 * @returns Ordered display-name parts.
 */
function authorNameParts(author: OptionalString): string[] {
    const NAME = (author ?? "").trim();
    if (NAME === "") {
        return [];
    }
    return NAME.split(/\s+/);
}

/**
 * Returns the last name part, ignoring a trailing generational suffix.
 * @param parts - Ordered display-name parts.
 * @returns Surname candidate for author sorting.
 */
function familyNamePart(parts: string[]): string {
    const LAST_INDEX = parts.length - 1;
    const LAST_PART = parts[LAST_INDEX] ?? "";
    if (AUTHOR_SUFFIXES.has(LAST_PART.toLowerCase())) {
        return parts[LAST_INDEX - 1] ?? "";
    }
    return LAST_PART;
}

/**
 * Extracts the surname sort key from a canonical display author.
 * @param author - Author text from the normalized book model.
 * @returns Surname candidate, or blank when no author is available.
 */
function authorFamilyName(author: OptionalString): string {
    return familyNamePart(authorNameParts(author));
}

/**
 * Compares canonical display authors by surname, then full name.
 * @param left - Left author display text.
 * @param right - Right author display text.
 * @returns Negative/zero/positive comparison result.
 */
export function compareAuthorText(
    left: OptionalString,
    right: OptionalString,
): number {
    const BY_FAMILY_NAME = compareText(
        authorFamilyName(left),
        authorFamilyName(right),
    );
    if (BY_FAMILY_NAME !== 0) {
        return BY_FAMILY_NAME;
    }
    return compareText(left, right);
}

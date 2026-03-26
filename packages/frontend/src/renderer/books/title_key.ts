const LEADING_THE_PREFIX = "the ";
const LEADING_THE_LENGTH = LEADING_THE_PREFIX.length;
const INITIAL_INDEX = 0;
const INITIAL_LENGTH = 1;

/**
 * Trims optional title text for normalization helpers.
 * @param value - Raw title text.
 * @returns Trimmed title or empty string.
 */
function normalizedText(value?: string | null): string {
    return String(value ?? "").trim();
}

/**
 * Produces a title sort key by removing leading "The " when present.
 * @param value - Raw title text.
 * @returns Sort key used for alphabetical title ordering.
 */
export function titleSortKey(value?: string | null): string {
    const TITLE = normalizedText(value);
    if (!TITLE) {
        return "";
    }

    const LOWER = TITLE.toLowerCase();
    if (!LOWER.startsWith(LEADING_THE_PREFIX)) {
        return TITLE;
    }

    const WITHOUT_THE = TITLE.slice(LEADING_THE_LENGTH).trimStart();
    if (!WITHOUT_THE) {
        return TITLE;
    }
    return WITHOUT_THE;
}

/**
 * Returns uppercase initial letter from the normalized title sort key.
 * @param value - Raw title text.
 * @returns Initial title letter or empty string when unavailable.
 */
export function titleInitialLetter(value?: string | null): string {
    const KEY = titleSortKey(value).trim();
    if (!KEY) {
        return "";
    }
    return KEY.slice(INITIAL_INDEX, INITIAL_LENGTH).toUpperCase();
}

/**
 * Estimated-words field text: shows thousands separators in the user's locale
 * with Latin digits, and reads them back as a plain integer, rejecting signs,
 * decimals, and other characters rather than silently dropping them.
 */
const NON_DIGITS = /\D/gu;
const GROUPING_PROBE = 10_000_000;
const WORD_COUNT_FORMAT = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
    numberingSystem: "latn",
});
const GROUP_SEPARATOR =
    WORD_COUNT_FORMAT.formatToParts(GROUPING_PROBE).find(
        (part) => part.type === "group",
    )?.value ?? ",";
const SPACES = /[\s\u00a0\u202f]/gu;
const WORD_COUNT_ERROR =
    "Estimated words must be a whole number, such as 192,000.";

/**
 * Escapes a literal for use inside a regular expression.
 * @param text - Literal text.
 * @returns Pattern-safe text.
 */
function escapePattern(text: string): string {
    return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

const GROUPED_DIGITS = new RegExp(
    String.raw`^\d+(?:${escapePattern(GROUP_SEPARATOR.replaceAll(SPACES, ""))}\d+)*$`,
    "u",
);

/**
 * Removes every kind of space, which some locales use to group digits.
 * @param text - Field text.
 * @returns Text without spaces.
 */
function compactWordCount(text: string): string {
    return String(text).replaceAll(SPACES, "");
}

/**
 * Checks that the field holds digits with optional thousands separators.
 * Signs, decimals, and other characters are not a word count.
 * @param text - Field text.
 * @returns `true` when blank or a valid grouped whole number.
 */
export function isValidWordCount(text: string): boolean {
    const COMPACT = compactWordCount(text);
    return COMPACT === "" || GROUPED_DIGITS.test(COMPACT);
}

/**
 * Reads a word count typed with or without thousands separators.
 * @param text - Field text such as `192,000` or `192000`.
 * @returns Whole number, or `null` when the field is blank.
 * @throws {Error} When the text is not a grouped whole number.
 */
export function parseWordCount(text: string): number | null {
    if (!isValidWordCount(text)) {
        throw new Error(WORD_COUNT_ERROR);
    }
    const DIGITS = compactWordCount(text).replaceAll(NON_DIGITS, "");
    if (DIGITS === "") {
        return null;
    }
    return Number(DIGITS);
}

/**
 * Formats a word count with thousands separators for display. Digits are
 * always Latin so the parser can read the text back.
 * @param value - Stored word count.
 * @returns Grouped number, or empty text when unset.
 */
export function formatWordCount(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
        return "";
    }
    return WORD_COUNT_FORMAT.format(value);
}

/**
 * Rewrites the words field with thousands separators. Invalid text is left
 * as typed so saving can report it instead of silently changing it.
 * @param input - Estimated-words input.
 */
export function formatWordsInput(input: HTMLInputElement): void {
    const FIELD = input;
    if (!isValidWordCount(FIELD.value)) {
        return;
    }
    FIELD.value = formatWordCount(parseWordCount(FIELD.value));
}

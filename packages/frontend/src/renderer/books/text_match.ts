/**
 * Accent- and case-insensitive search used by the book form pickers. A match
 * at the start of a word ranks before one inside a word, and the matched
 * characters are reported in the original text so they can be highlighted.
 */
import type { TextMatch, TextMatchRange } from "../../types/types.ts";
import { foldCollectionName } from "./collection.ts";

const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const NOT_FOUND = -1;
/** Rank of a match at the start of a word; lower ranks sort first. */
export const WORD_START_RANK = 0;
/** Rank of a match inside a word. */
export const SUBSTRING_RANK = 1;

// audit-allow-local-types: Private mapping from folded text back to the original.
type FoldedText = {
    folded: string;
    /** Original start and end of the character behind each folded unit. */
    sources: TextMatchRange[];
};

/**
 * Folds text one character at a time, remembering where each folded unit came
 * from so a folded hit can be mapped back to the original characters.
 * @param text - Original text.
 * @returns Folded text and its source map.
 */
function foldWithSources(text: string): FoldedText {
    const RESULT: FoldedText = { folded: "", sources: [] };
    let start = 0;
    for (const CHARACTER of text) {
        const END = start + CHARACTER.length;
        const FOLDED = foldCollectionName(CHARACTER);
        RESULT.folded += FOLDED;
        for (let unit = 0; unit < FOLDED.length; unit += 1) {
            RESULT.sources.push({ end: END, start });
        }
        start = END;
    }
    return RESULT;
}

/**
 * Checks whether a folded position begins a word.
 * @param folded - Folded text.
 * @param position - Position of a hit.
 * @returns `true` at the start of the text or after a non-word character.
 */
function startsWord(folded: string, position: number): boolean {
    if (position === 0) {
        return true;
    }
    return !WORD_CHARACTER.test(folded.charAt(position - 1));
}

/**
 * Finds the best hit position: the first word-start hit, else the first hit.
 * @param folded - Folded text.
 * @param query - Folded, non-empty query.
 * @returns Hit position, or `NOT_FOUND`.
 */
function bestPosition(folded: string, query: string): number {
    const FIRST = folded.indexOf(query);
    let position = FIRST;
    while (position !== NOT_FOUND) {
        if (startsWord(folded, position)) {
            return position;
        }
        position = folded.indexOf(query, position + 1);
    }
    return FIRST;
}

/**
 * Searches text for a query, ignoring case and accents.
 * @param text - Text to search, such as a collection name or book title.
 * @param rawQuery - Text typed by the user.
 * @returns The hit, or `null` when the query is blank or not found.
 */
export function matchText(text: string, rawQuery: string): TextMatch | null {
    const QUERY = foldCollectionName(rawQuery.trim());
    if (QUERY === "") {
        return null;
    }
    const SOURCE = foldWithSources(text);
    const POSITION = bestPosition(SOURCE.folded, QUERY);
    const FIRST = SOURCE.sources[POSITION];
    const LAST = SOURCE.sources[POSITION + QUERY.length - 1];
    if (FIRST === undefined || LAST === undefined) {
        return null;
    }
    let rank = SUBSTRING_RANK;
    if (startsWord(SOURCE.folded, POSITION)) {
        rank = WORD_START_RANK;
    }
    return { range: { end: LAST.end, start: FIRST.start }, rank };
}

/**
 * Builds a label whose matched characters are wrapped in `<mark>`.
 * @param text - Visible label text.
 * @param range - Characters to highlight, or `null` for none.
 * @returns Label span.
 */
export function highlightedLabel(
    text: string,
    range: TextMatchRange | null,
): HTMLSpanElement {
    const LABEL = document.createElement("span");
    LABEL.className = "book-result-label";
    if (range === null) {
        LABEL.textContent = text;
        return LABEL;
    }
    const MARK = document.createElement("mark");
    MARK.textContent = text.slice(range.start, range.end);
    LABEL.append(text.slice(0, range.start), MARK, text.slice(range.end));
    return LABEL;
}

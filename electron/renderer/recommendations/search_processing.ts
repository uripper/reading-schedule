import {
    type BookLookupItem,
    type RecommendationItem,
} from "../../types/types.js";
import { addLog } from "../help.js";
import { MAX_PER_AUTHOR, SAMPLE_RESULTS_COUNT } from "./search_constants.js";
import {
    authorMatches,
    normalizeLookupRecommendation,
    recommendationKey,
} from "./search_matchers.js";

interface ProcessAuthorOptions {
    author: string;
    existingKeys: Set<string>;
    lookupItems: BookLookupItem[];
    recommendationKeys: Set<string>;
    recommendations: RecommendationItem[];
}

/**
 * Returns a shuffled copy of values using Fisher-Yates.
 * @param values Source values.
 * @param randomFn Random number source in [0, 1).
 * @returns Shuffled copy of input values.
 */
function shuffledCopy<T>(values: T[], randomFn: () => number): T[] {
    const NEXT_VALUES = [...values];
    for (let index = NEXT_VALUES.length - 1; index > 0; index -= 1) {
        const SWAP_INDEX = Math.floor(randomFn() * (index + 1));
        const CURRENT = NEXT_VALUES[index];
        NEXT_VALUES[index] = NEXT_VALUES[SWAP_INDEX];
        NEXT_VALUES[SWAP_INDEX] = CURRENT;
    }
    return NEXT_VALUES;
}

/**
 * Picks up to `limit` random values from an input list without replacement.
 * @param values Source values.
 * @param limit Maximum number of values to pick.
 * @param randomFn Random number source in [0, 1).
 * @returns Random subset preserving shuffled order.
 */
export function pickRandomSample<T>(
    values: T[],
    limit: number,
    randomFn: () => number,
): T[] {
    if (limit <= 0 || values.length === 0) {
        return [];
    }
    return shuffledCopy(values, randomFn).slice(0, limit);
}

/**
 * Summarizes the first few results for diagnostics.
 * @param lookupItems Lookup results from Open Library.
 * @returns Comma-separated preview summary.
 */
export function sampleResultsSummary(lookupItems: BookLookupItem[]): string {
    const SAMPLE = lookupItems.slice(0, SAMPLE_RESULTS_COUNT);
    return SAMPLE.map((item) => `"${item.title}" by ${item.author}`).join(", ");
}

/**
 * Processes lookup results for one author, applying plausibility and dedup checks.
 * @param options Processing options containing author, results, and accumulators.
 * @returns Number of items added.
 */
export function processAuthorResults(options: ProcessAuthorOptions): number {
    const {
        author,
        lookupItems,
        existingKeys,
        recommendationKeys,
        recommendations,
    } = options;
    let addedForAuthor = 0;
    for (const LOOKUP_ITEM of lookupItems) {
        if (addedForAuthor >= MAX_PER_AUTHOR) {
            addLog(
                `Recommendations: Reached max (${MAX_PER_AUTHOR}) for author "${author}", stopping.`,
            );
            break;
        }
        const CANDIDATE = normalizeLookupRecommendation(LOOKUP_ITEM, author);
        if (CANDIDATE === null) {
            addLog(
                `Recommendations: Filtered out "${LOOKUP_ITEM.title}" - failed plausibility check`,
            );
            continue;
        }
        if (!authorMatches(author, CANDIDATE.author)) {
            addLog(
                `Recommendations: Filtered out "${CANDIDATE.title}" by ${CANDIDATE.author} - author mismatch (expected "${author}")`,
            );
            continue;
        }
        const KEY = recommendationKey(CANDIDATE.title, CANDIDATE.author);
        if (existingKeys.has(KEY) || recommendationKeys.has(KEY)) {
            addLog(
                `Recommendations: Filtered out "${CANDIDATE.title}" - already in shelf or added`,
            );
            continue;
        }
        addLog(
            `Recommendations: Adding "${CANDIDATE.title}" by ${CANDIDATE.author}`,
        );
        recommendationKeys.add(KEY);
        recommendations.push(CANDIDATE);
        addedForAuthor += 1;
    }
    return addedForAuthor;
}

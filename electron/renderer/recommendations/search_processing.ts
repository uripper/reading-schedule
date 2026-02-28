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
    const nextValues = [...values];
    for (let index = nextValues.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(randomFn() * (index + 1));
        const current = nextValues[index];
        nextValues[index] = nextValues[swapIndex];
        nextValues[swapIndex] = current;
    }
    return nextValues;
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
    const sample = lookupItems.slice(0, SAMPLE_RESULTS_COUNT);
    return sample.map((item) => `"${item.title}" by ${item.author}`).join(", ");
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
    for (const lookupItem of lookupItems) {
        if (addedForAuthor >= MAX_PER_AUTHOR) {
            addLog(
                `Recommendations: Reached max (${MAX_PER_AUTHOR}) for author "${author}", stopping.`,
            );
            break;
        }
        const candidate = normalizeLookupRecommendation(lookupItem, author);
        if (candidate === null) {
            addLog(
                `Recommendations: Filtered out "${lookupItem.title}" - failed plausibility check`,
            );
            continue;
        }
        if (!authorMatches(author, candidate.author)) {
            addLog(
                `Recommendations: Filtered out "${candidate.title}" by ${candidate.author} - author mismatch (expected "${author}")`,
            );
            continue;
        }
        const key = recommendationKey(candidate.title, candidate.author);
        if (existingKeys.has(key) || recommendationKeys.has(key)) {
            addLog(
                `Recommendations: Filtered out "${candidate.title}" - already in shelf or added`,
            );
            continue;
        }
        addLog(
            `Recommendations: Adding "${candidate.title}" by ${candidate.author}`,
        );
        recommendationKeys.add(key);
        recommendations.push(candidate);
        addedForAuthor += 1;
    }
    return addedForAuthor;
}

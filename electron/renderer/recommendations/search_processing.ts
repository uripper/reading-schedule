import type { BookLookupItem, RecommendationItem } from "../../types/types.ts";
import { addLog } from "../help.ts";
import { MAX_PER_AUTHOR, SAMPLE_RESULTS_COUNT } from "./search_constants.ts";
import {
    authorMatches,
    normalizeLookupRecommendation,
    recommendationKey,
} from "./search_matchers.ts";

interface ProcessAuthorOptions {
    author: string;
    existingKeys: Set<string>;
    lookupItems: BookLookupItem[];
    recommendationKeys: Set<string>;
    recommendations: RecommendationItem[];
}

type EligibleRecommendation = {
    candidate: RecommendationItem;
    key: string;
};

/**
 * Returns a shuffled copy of values using Fisher-Yates.
 * @param values - Source values.
 * @param randomFn - Random number source in [0, 1).
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
 * @param values - Source values.
 * @param limit - Maximum number of values to pick.
 * @param randomFn - Random number source in [0, 1).
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
 * @param lookupItems - Lookup results from Open Library.
 * @returns Comma-separated preview summary.
 */
export function sampleResultsSummary(lookupItems: BookLookupItem[]): string {
    const SAMPLE = lookupItems.slice(0, SAMPLE_RESULTS_COUNT);
    return SAMPLE.map((item) => `"${item.title}" by ${item.author}`).join(", ");
}

function reachedAuthorLimit(addedForAuthor: number, author: string): boolean {
    if (addedForAuthor < MAX_PER_AUTHOR) {
        return false;
    }
    addLog(
        `Recommendations: Reached max (${MAX_PER_AUTHOR}) for author "${author}", stopping.`,
    );
    return true;
}

function normalizedRecommendation(
    lookupItem: BookLookupItem,
    author: string,
): RecommendationItem | null {
    const CANDIDATE = normalizeLookupRecommendation(lookupItem, author);
    if (CANDIDATE !== null) {
        return CANDIDATE;
    }
    addLog(
        `Recommendations: Filtered out "${lookupItem.title}" - failed plausibility check`,
    );
    return null;
}

function hasMatchingAuthor(
    author: string,
    candidate: RecommendationItem,
): boolean {
    if (authorMatches(author, candidate.author)) {
        return true;
    }
    addLog(
        `Recommendations: Filtered out "${candidate.title}" by ${candidate.author} - author mismatch (expected "${author}")`,
    );
    return false;
}

function uniqueRecommendationKey(
    candidate: RecommendationItem,
    existingKeys: Set<string>,
    recommendationKeys: Set<string>,
): string | null {
    const KEY = recommendationKey(candidate.title, candidate.author);
    if (!existingKeys.has(KEY) && !recommendationKeys.has(KEY)) {
        return KEY;
    }
    addLog(
        `Recommendations: Filtered out "${candidate.title}" - already in shelf or added`,
    );
    return null;
}

function eligibleRecommendation(
    options: ProcessAuthorOptions,
    lookupItem: BookLookupItem,
): EligibleRecommendation | null {
    const CANDIDATE = normalizedRecommendation(lookupItem, options.author);
    if (CANDIDATE === null) {
        return null;
    }
    if (!hasMatchingAuthor(options.author, CANDIDATE)) {
        return null;
    }
    const KEY = uniqueRecommendationKey(
        CANDIDATE,
        options.existingKeys,
        options.recommendationKeys,
    );
    if (KEY === null) {
        return null;
    }
    return { candidate: CANDIDATE, key: KEY };
}

function addRecommendation(
    recommendation: EligibleRecommendation,
    options: ProcessAuthorOptions,
): void {
    addLog(
        `Recommendations: Adding "${recommendation.candidate.title}" by ${recommendation.candidate.author}`,
    );
    options.recommendationKeys.add(recommendation.key);
    options.recommendations.push(recommendation.candidate);
}

/**
 * Processes lookup results for one author, applying plausibility and dedup checks.
 * @param options - Processing options containing author, results, and accumulators.
 * @returns Number of items added.
 */
export function processAuthorResults(options: ProcessAuthorOptions): number {
    let addedForAuthor = 0;
    for (const LOOKUP_ITEM of options.lookupItems) {
        if (reachedAuthorLimit(addedForAuthor, options.author)) {
            break;
        }
        const RECOMMENDATION = eligibleRecommendation(options, LOOKUP_ITEM);
        if (RECOMMENDATION === null) {
            continue;
        }
        addRecommendation(RECOMMENDATION, options);
        addedForAuthor += 1;
    }
    return addedForAuthor;
}

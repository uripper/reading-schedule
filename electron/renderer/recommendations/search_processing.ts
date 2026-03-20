/**
 * Recommendation lookup post-processing: sampling, summary logging, and per-author dedupe.
 */
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

/**
 * Represents a lookup item that survived plausibility and dedupe checks.
 */
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

/**
 * Stops adding rows once the per-author recommendation cap is reached.
 * @param addedForAuthor - Number of rows already accepted for this author.
 * @param author - Author name used in the diagnostic message.
 * @returns `true` when the caller should stop scanning lookup rows.
 */
function reachedAuthorLimit(addedForAuthor: number, author: string): boolean {
    if (addedForAuthor < MAX_PER_AUTHOR) {
        return false;
    }
    addLog(
        `Recommendations: Reached max (${MAX_PER_AUTHOR}) for author "${author}", stopping.`,
    );
    return true;
}

/**
 * Converts a lookup row into a recommendation item when it passes plausibility checks.
 * @param lookupItem - Raw lookup item from the API.
 * @param author - Author context used for normalization and fallback display text.
 * @returns Normalized recommendation row or `null` when the row should be ignored.
 */
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

/**
 * Verifies the candidate author still matches the shelf author we searched for.
 * @param author - Author sampled from the read shelf.
 * @param candidate - Recommendation item produced from lookup data.
 * @returns `true` when the author text still matches closely enough.
 */
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

/**
 * Builds a dedupe key and rejects rows already present in the shelf or in the current recommendation list.
 * @param candidate - Candidate recommendation row.
 * @param existingKeys - Keys already present in the shelf.
 * @param recommendationKeys - Keys already added during this search run.
 * @returns Dedupe key when the candidate is still eligible, otherwise `null`.
 */
function uniqueRecommendationKey(
    candidate: RecommendationItem,
    existingKeys: Set<string>,
    recommendationKeys: Set<string>,
): string | null {
    const KEY = recommendationKey(candidate.title, candidate.author);
    if (!(existingKeys.has(KEY) || recommendationKeys.has(KEY))) {
        return KEY;
    }
    addLog(
        `Recommendations: Filtered out "${candidate.title}" - already in shelf or added`,
    );
    return null;
}

/**
 * Fully evaluates one lookup item for a sampled author and returns the eligible result when it survives.
 * @param options - Current author-processing state.
 * @param lookupItem - Raw lookup row to inspect.
 * @returns Eligible recommendation payload or `null`.
 */
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

/**
 * Appends one eligible recommendation to the accumulated results.
 * @param recommendation - Fully validated recommendation.
 * @param options - Mutable search accumulators.
 */
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
 * Validates a lookup row and returns how many recommendations were added from it.
 * @param options - Current author-processing state.
 * @param lookupItem - Raw lookup row to inspect.
 * @returns `1` when the item was added, otherwise `0`.
 */
function addEligibleRecommendation(
    options: ProcessAuthorOptions,
    lookupItem: BookLookupItem,
): number {
    const RECOMMENDATION = eligibleRecommendation(options, lookupItem);
    if (RECOMMENDATION === null) {
        return 0;
    }
    addRecommendation(RECOMMENDATION, options);
    return 1;
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
        addedForAuthor += addEligibleRecommendation(options, LOOKUP_ITEM);
    }
    return addedForAuthor;
}

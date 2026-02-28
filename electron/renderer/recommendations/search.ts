import {
    type Book,
    type BookLookupItem,
    type RecommendationItem,
    type RecommendationSearchApi,
} from "../../types/types.js";
import { addLog } from "../help.js";
import { buildRecommendations, deriveReadAuthors } from "./model.js";
import { MAX_AUTHORS } from "./search_constants.js";
import { addExistingBookKeys } from "./search_matchers.js";
import {
    pickRandomSample,
    processAuthorResults,
    sampleResultsSummary,
} from "./search_processing.js";

interface RecommendationSearchOptions {
    randomFn?(this: void): number;
}

/**
 * Fetches recommendations from lookup search using already-read authors in the shelf.
 * Falls back to static local recommendations when no dynamic matches are found.
 * @param books Existing library books.
 * @param api Planner API lookup surface.
 * @param options Optional random source used for author sampling.
 * @returns Recommendation rows suitable for panel rendering.
 */
export async function findRecommendations(
    books: Book[],
    api: RecommendationSearchApi,
    options: RecommendationSearchOptions = {},
): Promise<RecommendationItem[]> {
    addLog("Recommendations: Starting search...");
    const EXISTING_KEYS = addExistingBookKeys(books);
    const RECOMMENDATION_KEYS = new Set<string>();
    const RECOMMENDATIONS: RecommendationItem[] = [];
    let randomFn: () => number = Math.random;
    const RANDOM_SOURCE = options.randomFn;
    if (typeof RANDOM_SOURCE === "function") {
        randomFn = (): number => RANDOM_SOURCE();
    }
    const DERIVED_READ_AUTHORS = deriveReadAuthors(books);
    const READ_AUTHORS = pickRandomSample(
        DERIVED_READ_AUTHORS,
        MAX_AUTHORS,
        randomFn,
    );

    addLog(
        `Recommendations: Derived ${DERIVED_READ_AUTHORS.length} read authors: ${DERIVED_READ_AUTHORS.join(", ")}`,
    );
    addLog(
        `Recommendations: Sampled ${READ_AUTHORS.length} read authors for this run: ${READ_AUTHORS.join(", ")}`,
    );

    for (const AUTHOR of READ_AUTHORS) {
        let lookupItems: BookLookupItem[] = [];
        addLog(
            `Recommendations: Searching for author-only results: "${AUTHOR}"`,
        );
        try {
            lookupItems = await api.searchBooks(AUTHOR, true);
            addLog(
                `Recommendations: Got ${lookupItems.length} results for "${AUTHOR}"`,
            );
            if (lookupItems.length > 0) {
                addLog(
                    `Recommendations: Sample results: ${sampleResultsSummary(lookupItems)}`,
                );
            }
        } catch (error) {
            addLog(
                `Recommendations: Search failed for "${AUTHOR}": ${String(error)}`,
            );
            lookupItems = [];
        }
        processAuthorResults({
            author: AUTHOR,
            existingKeys: EXISTING_KEYS,
            lookupItems,
            recommendationKeys: RECOMMENDATION_KEYS,
            recommendations: RECOMMENDATIONS,
        });
    }

    if (RECOMMENDATIONS.length > 0) {
        addLog(
            `Recommendations: Found ${RECOMMENDATIONS.length} dynamic recommendations, using those.`,
        );
        return RECOMMENDATIONS;
    }
    addLog(
        "Recommendations: No dynamic results, falling back to static catalog.",
    );
    return buildRecommendations(books);
}
